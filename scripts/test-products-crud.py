#!/usr/bin/env python3
"""Test réel : crée, lit, modifie puis supprime un produit temporaire PostgreSQL."""
import base64
import getpass
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Adresse HTTP(S) requise")
    username = input("Identifiant backend [user] : ").strip() or "user"
    password = getpass.getpass("Mot de passe backend : ")
    auth = "Basic " + base64.b64encode(f"{username}:{password}".encode()).decode()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    # Ne jamais transmettre les identifiants vers une destination de redirection.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    opener.add_handler(NoRedirect())
    csrf = {}

    def request(method, path, body=None):
        headers = {"Authorization": auth, "Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if method not in ("GET", "HEAD"):
            headers[csrf["headerName"]] = csrf["token"]
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
        with opener.open(req, timeout=20) as response:
            content = response.read()
            return response.status, json.loads(content) if content else None

    status, csrf = request("GET", "/api/csrf")
    if status != 200 or not csrf.get("token"):
        raise RuntimeError("Jeton CSRF indisponible")
    status, listing = request("GET", "/api/products?page=0&size=20")
    if listing.get("source") != "postgres":
        raise RuntimeError("Ce test exige BUSINESS_DATA_SOURCE=postgres")
    product_id = None
    payload = {"reference": "CRUD-" + uuid.uuid4().hex[:16], "name": "Produit temporaire",
               "category": "Test", "price": 1200.50}
    try:
        status, product = request("POST", "/api/products", payload)
        product_id = product["id"]
        assert status == 201
        path = "/api/products/" + urllib.parse.quote(product_id, safe="")
        status, product = request("GET", path)
        assert status == 200 and product["reference"] == payload["reference"]
        payload["name"] = "Produit temporaire modifié"
        status, product = request("PUT", path, payload)
        assert status == 200 and product["name"] == payload["name"]
        status, _ = request("DELETE", path)
        assert status == 204
        product_id = None
        try:
            request("GET", path)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
        else:
            raise AssertionError("Le produit supprimé existe encore")
        print("CRUD validé : création 201, lecture 200, modification 200, suppression 204, absence 404.")
    finally:
        if product_id is not None:
            request("DELETE", "/api/products/" + urllib.parse.quote(product_id, safe=""))


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f"Échec HTTP {error.code} : {error.read().decode()}", file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        print(f"Échec : {error}", file=sys.stderr)
        sys.exit(1)
