-- Date métier : mise en place des poussins = J1. Les dates historiques inconnues restent nulles.
ALTER TABLE livestock_lot ADD COLUMN creation_date DATE;
ALTER TABLE livestock_lot ADD CONSTRAINT livestock_lot_creation_date_min
    CHECK (creation_date IS NULL OR creation_date >= DATE '0001-01-01');
