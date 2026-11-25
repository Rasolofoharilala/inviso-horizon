#!/usr/bin/env python3
"""Test réel. Crée un lot de test et conserve son journal, conformément à la règle métier."""
import concurrent.futures
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import getpass
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

base=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8080').rstrip('/')
assert urllib.parse.urlsplit(base).scheme in ('http','https')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        return None
class Client:
    def __init__(self):
        self.opener=urllib.request.build_opener(NoRedirect(),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf=None
    def request(self,method,path,body=None):
        headers={'Accept':'application/json'}
        if method!='GET':
            if not self.csrf:
                status,self.csrf=self.request('GET','/api/csrf')
                assert status==200
            headers[self.csrf['headerName']]=self.csrf['token']
        data=None
        if body is not None:
            data=json.dumps(body).encode();headers['Content-Type']='application/json'
        try:
            with self.opener.open(urllib.request.Request(base+path,data=data,headers=headers,method=method),timeout=30) as response:
                raw=response.read();return response.status,json.loads(raw) if raw else None
        except urllib.error.HTTPError as response:
            raw=response.read()
            try: payload=json.loads(raw)
            except ValueError: payload={}
            return response.code,payload
    def login(self,user,password):
        status,self.csrf=self.request('GET','/api/csrf');assert status==200
        request=urllib.request.Request(base+'/api/auth/login',data=urllib.parse.urlencode({'username':user,'password':password}).encode(),headers={'Content-Type':'application/x-www-form-urlencoded',self.csrf['headerName']:self.csrf['token']})
        with self.opener.open(request,timeout=30) as response: assert response.status==204
        self.csrf=None

password=getpass.getpass('Mot de passe admin : ')
admin=Client();admin.login('admin',password)
viewer=Client();viewer.login('lecteur',getpass.getpass('Mot de passe lecteur : '))
today=datetime.now(ZoneInfo('Indian/Antananarivo')).date()
start=today-timedelta(days=14)
reference='AUDIT-'+uuid.uuid4().hex[:12].upper()
status,lot=admin.request('POST','/api/lots',{'reference':reference,'name':'Test journal '+reference,'creationDate':start.isoformat(),'maleCount':10,'femaleCount':20})
assert status==201,lot
path='/api/lots/'+lot['id']
print('Lot de test créé :',reference,'; son historique restera conservé.')
def movement(kind,days,males,females):
    return {'requestId':str(uuid.uuid4()),'type':kind,'effectiveDate':(today-timedelta(days=days)).isoformat(),'males':males,'females':females,'reason':'Test automatique '+reference}
assert viewer.request('POST',path+'/movements',movement('ENTRY',0,1,1))[0]==403
assert admin.request('POST',path+'/movements',movement('EXIT',0,0,0))[0]==400
assert admin.request('POST',path+'/movements',movement('ENTRY',-1,1,1))[0]==400
status,death=admin.request('POST',path+'/movements',movement('MORTALITY',7,2,1));assert status==201,death
entry_payload=movement('ENTRY',10,3,2)
status,entry=admin.request('POST',path+'/movements',entry_payload);assert status==201,entry
status,retry=admin.request('POST',path+'/movements',entry_payload);assert status==201 and retry['id']==entry['id']
status,sale=admin.request('POST',path+'/movements',movement('SALE',1,10,0));assert status==201,sale
assert admin.request('POST',path+'/movements',movement('EXIT',9,20,0))[0]==409
status,current=admin.request('GET',path);assert status==200 and (current['maleCount'],current['femaleCount'])==(1,21)
assert current['movementCount']==3
assert admin.request('POST',path+'/movements/'+entry['id']+'/cancel',{'reason':'Annulation impossible : vente dépendante'})[0]==409
assert viewer.request('POST',path+'/movements/'+sale['id']+'/cancel',{'reason':'Interdit'})[0]==403
assert admin.request('POST',path+'/movements/'+sale['id']+'/cancel',{'reason':'Vente saisie par erreur'})[0]==200
assert admin.request('POST',path+'/movements/'+entry['id']+'/cancel',{'reason':'Entrée saisie par erreur'})[0]==200
status,current=admin.request('GET',path);assert status==200 and (current['maleCount'],current['femaleCount'])==(8,19)
status,history=admin.request('GET',path+'/movements?order=asc&size=1');assert status==200 and history['totalElements']==3 and len(history['items'])==1
status,history=admin.request('GET',path+'/movements?order=asc');assert sum(item['cancelledAt'] is not None for item in history['items'])==2
status,graph=admin.request('GET',path+'/evolution?interval=day');assert status==200,graph
assert (graph['points'][0]['males'],graph['points'][0]['females'])==(10,20)
assert (graph['points'][-1]['males'],graph['points'][-1]['females'])==(8,19)
assert len(graph['points'])==15
status,weekly=admin.request('GET',path+'/evolution?interval=week');assert status==200 and len(weekly['points'])==4
changed={'reference':current['reference'],'name':current['name'],'creationDate':current['creationDate'],'maleCount':999,'femaleCount':20,'version':current['version']}
assert admin.request('PUT',path,changed)[0]==409
assert admin.request('DELETE',path+'?version='+str(current['version']))[0]==409
# Deux connexions indépendantes tentent de sortir les huit derniers mâles.
clients=[Client(),Client()]
for client in clients: client.login('admin',password)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    results=list(executor.map(lambda client:client.request('POST',path+'/movements',movement('EXIT',0,8,0))[0],clients))
assert sorted(results)==[201,409],results
status,current=admin.request('GET',path);assert status==200 and current['maleCount']==0
print('OK : rétroactivité, idempotence, soldes, annulations, rôles, concurrence, chronologie et diagramme.')
print('Lot conservé pour inspection :',reference)
