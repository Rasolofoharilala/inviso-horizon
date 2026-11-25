package com.inviso.horizon.livestock;

import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lots")
public class LotController {
    private final LotService service;
    public LotController(LotService service) { this.service = service; }
    @GetMapping public LotService.LotPage list(@RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.list(q, page, size);
    }
    @GetMapping("/{id}") public LotService.LotView get(@PathVariable long id) { return service.get(id); }
    @PostMapping public ResponseEntity<LotService.LotView> create(@Valid @RequestBody LotInput input) {
        var lot = service.create(input);
        return ResponseEntity.created(URI.create("/api/lots/" + lot.id())).body(lot);
    }
    @PutMapping("/{id}") public LotService.LotView update(@PathVariable long id, @Valid @RequestBody LotInput input) { return service.update(id, input); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable long id, @RequestParam long version) {
        service.delete(id, version); return ResponseEntity.noContent().build();
    }
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    ProblemDetail expectedFailure(org.springframework.web.server.ResponseStatusException exception) {
        return ProblemDetail.forStatusAndDetail(exception.getStatusCode(),
            java.util.Objects.requireNonNullElse(exception.getReason(), "Opération impossible."));
    }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    ProblemDetail duplicate() { return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Cette référence de lot existe déjà ou les données sont incompatibles."); }
    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    ProblemDetail concurrentChange() { return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Ce lot a changé. Actualisez la liste avant de réessayer."); }
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    ProblemDetail invalid(org.springframework.web.bind.MethodArgumentNotValidException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Vérifiez la référence, le nom, la date de mise en place et les effectifs : des entiers positifs ou nuls sont requis.");
        detail.setProperty("errors", exception.getBindingResult().getFieldErrors().stream().map(error ->
            java.util.Map.of("field", error.getField(), "message", java.util.Objects.requireNonNullElse(error.getDefaultMessage(), "Valeur invalide"))).toList());
        return detail;
    }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    ProblemDetail invalidJson() { return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Corps JSON invalide : date au format AAAA-MM-JJ et effectifs entiers entre 0 et 2 147 483 647 requis."); }
}
