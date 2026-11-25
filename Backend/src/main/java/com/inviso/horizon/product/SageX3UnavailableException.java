package com.inviso.horizon.product;

public class SageX3UnavailableException extends RuntimeException {
    public SageX3UnavailableException() {
        super("L'adaptateur Sage X3 attend la configuration et le contrat de l'API de votre installation.");
    }
}
