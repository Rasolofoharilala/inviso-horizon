package com.inviso.horizon.data;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(BusinessDataProperties.class)
public class DataSourceConfiguration {
}
