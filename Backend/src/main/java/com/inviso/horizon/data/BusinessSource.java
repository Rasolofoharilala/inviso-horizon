package com.inviso.horizon.data;

public enum BusinessSource {
    POSTGRES("postgres"), SAGE_X3("sage-x3");

    private final String code;

    BusinessSource(String code) { this.code = code; }

    public String code() { return code; }
}
