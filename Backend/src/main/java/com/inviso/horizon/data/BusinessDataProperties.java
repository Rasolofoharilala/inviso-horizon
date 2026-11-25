package com.inviso.horizon.data;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "horizon.data")
public record BusinessDataProperties(BusinessSource source) {
    public BusinessDataProperties {
        if (source == null) source = BusinessSource.POSTGRES;
    }
}
