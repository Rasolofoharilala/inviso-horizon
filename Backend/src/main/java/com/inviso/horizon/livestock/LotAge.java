package com.inviso.horizon.livestock;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Numérotation inclusive : mise en place = J1 ; J1 à J7 = semaine 1. */
public record LotAge(long day, long week) {
    public static LotAge at(LocalDate creationDate, LocalDate asOf) {
        if (creationDate.isAfter(asOf)) throw new IllegalArgumentException("Date de mise en place dans le futur.");
        long elapsed = ChronoUnit.DAYS.between(creationDate, asOf);
        return new LotAge(elapsed + 1, elapsed / 7 + 1);
    }
}
