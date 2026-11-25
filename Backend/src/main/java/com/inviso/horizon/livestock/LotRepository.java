package com.inviso.horizon.livestock;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface LotRepository extends JpaRepository<LivestockLot, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM LivestockLot l WHERE l.id = :id")
    java.util.Optional<LivestockLot> findLockedById(@Param("id") long id);
    @Query("SELECT l FROM LivestockLot l WHERE :q = '' OR locate(lower(:q), lower(l.reference)) > 0 OR locate(lower(:q), lower(l.name)) > 0")
    Page<LivestockLot> search(@Param("q") String query, Pageable pageable);
    interface Totals {
        long getLotCount();
        long getMaleCount();
        long getFemaleCount();
    }
    @Query("SELECT count(l) AS lotCount, coalesce(sum(l.maleCount), 0) AS maleCount, coalesce(sum(l.femaleCount), 0) AS femaleCount FROM LivestockLot l WHERE :q = '' OR locate(lower(:q), lower(l.reference)) > 0 OR locate(lower(:q), lower(l.name)) > 0")
    Totals totals(@Param("q") String query);
}
