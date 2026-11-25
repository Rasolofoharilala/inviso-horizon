package com.inviso.horizon.product;

import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService service;

    public ProductController(ProductService service) { this.service = service; }

    @GetMapping
    public ProductPage findAll(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "20") int size) {
        return service.findAll(page, size);
    }

    @GetMapping("/{id}")
    public ProductView findById(@PathVariable String id) { return service.findById(id); }

    @PostMapping
    public ResponseEntity<ProductView> create(@Valid @RequestBody ProductInput input) {
        var product = service.create(input);
        return ResponseEntity.created(URI.create("/api/products/" + product.id())).body(product);
    }

    @PutMapping("/{id}")
    public ProductView update(@PathVariable String id, @Valid @RequestBody ProductInput input) {
        return service.update(id, input);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(ProductNotFoundException.class)
    ProblemDetail notFound(ProductNotFoundException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    ProblemDetail conflict() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "Référence déjà utilisée ou opération incompatible avec les contraintes des données.");
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    ProblemDetail invalidInput(org.springframework.web.bind.MethodArgumentNotValidException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Vérifiez les champs du produit.");
        detail.setProperty("errors", exception.getBindingResult().getFieldErrors().stream()
                .map(error -> java.util.Map.of("field", error.getField(),
                        "message", java.util.Objects.requireNonNullElse(error.getDefaultMessage(), "Valeur invalide")))
                .toList());
        return detail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalidPage(IllegalArgumentException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(SageX3UnavailableException.class)
    ProblemDetail sageUnavailable(SageX3UnavailableException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage());
        detail.setTitle("Source Sage X3 indisponible");
        detail.setProperty("code", "SAGE_X3_NOT_CONFIGURED");
        return detail;
    }
}
