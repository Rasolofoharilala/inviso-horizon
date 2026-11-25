package com.inviso.horizon.livestock;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "livestock_lot")
public class LivestockLot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 80)
    private String reference;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(name = "male_count", nullable = false)
    private Integer maleCount;
    @Column(name = "female_count", nullable = false)
    private Integer femaleCount;
    @Column(name = "creation_date")
    private LocalDate creationDate;
    @Version @Column(nullable = false)
    private Long version;
    protected LivestockLot() { }
    public LivestockLot(LotInput input) { replace(input); }
    public void replace(LotInput input) {
        creationDate = input.creationDate();
        reference = input.reference(); name = input.name();
        maleCount = input.maleCount().intValueExact(); femaleCount = input.femaleCount().intValueExact();
    }
    public LocalDate getCreationDate() { return creationDate; }
    public Long getId() { return id; }
    public String getReference() { return reference; }
    public String getName() { return name; }
    public Integer getMaleCount() { return maleCount; }
    public Integer getFemaleCount() { return femaleCount; }
    public Long getVersion() { return version; }
    public long getTotal() { return (long) maleCount + femaleCount; }
}
