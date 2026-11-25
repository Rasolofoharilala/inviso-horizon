package com.inviso.horizon.livestock;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

@Configuration(proxyBeanMethods = false)
public class LivestockTimeConfiguration {
    @Bean("livestockClock")
    Clock livestockClock(@Value("${horizon.livestock.time-zone:Indian/Antananarivo}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
