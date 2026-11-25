package com.inviso.horizon.livestock;

import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/lots/{lotId}")
public class LotMovementController {
    private final LotLedger ledger;
    public LotMovementController(LotLedger ledger) { this.ledger=ledger; }
    @GetMapping("/movements") public LotLedger.History history(@PathVariable long lotId,
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size, @RequestParam(defaultValue="desc") String order) {
        return ledger.history(lotId,page,size,order);
    }
    @PostMapping("/movements") @ResponseStatus(HttpStatus.CREATED)
    public LotLedger.Movement add(@PathVariable long lotId, @Valid @RequestBody LotLedger.Input input, Authentication auth) { return ledger.add(lotId,input,auth.getName()); }
    @PostMapping("/movements/{id}/cancel") public LotLedger.Movement cancel(@PathVariable long lotId, @PathVariable long id,
        @Valid @RequestBody LotLedger.Cancellation input, Authentication auth) { return ledger.cancel(lotId,id,input.reason(),auth.getName()); }
    @GetMapping("/evolution") public LotLedger.Evolution evolution(@PathVariable long lotId, @RequestParam(required=false) LocalDate from,
        @RequestParam(required=false) LocalDate to, @RequestParam(defaultValue="week") String interval) { return ledger.evolution(lotId,from,to,interval); }
    @ExceptionHandler(ResponseStatusException.class) ProblemDetail failure(ResponseStatusException exception) {
        return ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason());
    }
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class) ProblemDetail validation() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Renseignez une date, un motif et des quantités entières positives ou nulles, avec au moins un animal.");
    }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class) ProblemDetail json() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Type, date ou quantités de mouvement invalides.");
    }
}
