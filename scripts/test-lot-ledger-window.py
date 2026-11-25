#!/usr/bin/env python3
"""Teste le SQL de cumul réel sur SQLite ; ne remplace pas les tests PostgreSQL/HTTP."""
from pathlib import Path
import re
import sqlite3

source=(Path(__file__).resolve().parents[1]/'Backend/src/main/java/com/inviso/horizon/livestock/LotLedger.java').read_text()
query=re.search(r'BALANCES = "([^"]+)";',source).group(1)
connection=sqlite3.connect(':memory:')
connection.row_factory=sqlite3.Row
connection.execute('CREATE TABLE livestock_lot(id INTEGER PRIMARY KEY, male_count INTEGER, female_count INTEGER)')
connection.execute('CREATE TABLE lot_movement(id INTEGER PRIMARY KEY, lot_id INTEGER, effective_date TEXT, male_delta INTEGER, female_delta INTEGER, cancelled_at TEXT)')
connection.execute('INSERT INTO livestock_lot VALUES(1,10,20)')
def add(id,date,males,females):
    connection.execute('INSERT INTO lot_movement VALUES(?,1,?,?,?,NULL)',(id,date,males,females))
def balances():
    return [(row['id'],row['male_after'],row['female_after']) for row in connection.execute(query,(1,))]
class BoolOr:
    def __init__(self): self.value=False
    def step(self,value): self.value=self.value or bool(value)
    def finalize(self): return int(self.value)
connection.create_aggregate('bool_or',1,BoolOr)
validation='SELECT coalesce(bool_or(male_after < 0 OR female_after < 0 OR male_after > 2147483647 OR female_after > 2147483647),false) FROM ('+query+') ledger'
def invalid(): return bool(connection.execute(validation,(1,)).fetchone()[0])
assert not invalid()
add(1,'2026-11-08',-2,-1)
add(2,'2026-11-05',3,2)
assert balances()==[(2,13,22),(1,11,21)]
assert not invalid()
add(3,'2026-11-06',-20,0)
assert invalid() # Une sortie rétroactive rendrait les jours ultérieurs négatifs.
connection.execute('DELETE FROM lot_movement WHERE id=3')
add(3,'2026-11-14',-10,0)
assert balances()[-1]==(3,1,21)
connection.execute("UPDATE lot_movement SET cancelled_at='now' WHERE id=2")
assert invalid() # Une vente dépend de cette entrée.
connection.execute("UPDATE lot_movement SET cancelled_at='now' WHERE id=3")
assert not invalid()
assert balances()[-1]==(3,8,19)
assert len(balances())==3 # Les événements annulés restent au journal.
add(4,'2026-11-08',1,0)
assert [row[0] for row in balances()]==[2,1,4,3] # Même date : ordre stable par id.
print('OK : SQL de cumul, rétroactivité, bornes, annulations et ordre stable (SQLite).')
