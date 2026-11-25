package com.inviso.horizon.security;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Le client conserve le cookie de session et transmet le jeton sur les écritures. */
@RestController
public class CsrfController {
    @GetMapping("/api/csrf")
    public CsrfToken csrf(CsrfToken token) { return token; }
}
