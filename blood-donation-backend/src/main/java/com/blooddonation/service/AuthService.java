package com.blooddonation.service;

import com.blooddonation.dto.SignUpRequest;
import com.blooddonation.dto.UpdateProfileRequest;
import com.blooddonation.model.User;
import com.blooddonation.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User signUp(SignUpRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email is already registered");
        }
        if (userRepository.existsByMobileNumber(request.mobileNumber())) {
            throw new ConflictException("Mobile number is already registered");
        }
        if (request.dateOfBirth().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Date of birth cannot be in the future");
        }
        if (!request.consentAccepted()) {
            throw new IllegalArgumentException("Consent is required");
        }

        User user = new User();
        user.setFirstName(clean(request.firstName()));
        user.setMiddleName(cleanNullable(request.middleName()));
        user.setLastName(clean(request.lastName()));
        user.setFatherName(cleanNullable(request.fatherName()));
        user.setMotherName(cleanNullable(request.motherName()));
        user.setEmail(email);
        user.setMobileNumber(request.mobileNumber());
        user.setDateOfBirth(request.dateOfBirth());
        user.setBloodGroup(request.bloodGroup());
        user.setGender(request.gender());
        user.setMedicalConditions(cleanNullable(request.medicalConditions()));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("USER");
        user.setConsentAccepted(true);
        user.setConsentAcceptedAt(Instant.now());

        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // Protects against two simultaneous requests attempting the same email/mobile.
            throw new ConflictException("Email or mobile number is already registered");
        }
    }

    @Transactional
    public User updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
            .orElseThrow(() -> new NotFoundException("User not found"));

        if (userRepository.existsByMobileNumber(request.mobileNumber())
                && !user.getMobileNumber().equals(request.mobileNumber())) {
            throw new ConflictException("Mobile number is already registered");
        }

        user.setFirstName(clean(request.firstName()));
        user.setMiddleName(cleanNullable(request.middleName()));
        user.setLastName(clean(request.lastName()));
        user.setFatherName(cleanNullable(request.fatherName()));
        user.setMotherName(cleanNullable(request.motherName()));
        user.setMobileNumber(request.mobileNumber());
        user.setDateOfBirth(request.dateOfBirth());
        user.setBloodGroup(request.bloodGroup());
        user.setGender(request.gender());
        user.setMedicalConditions(cleanNullable(request.medicalConditions()));

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalizeEmail(email))
            .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private String normalizeEmail(String value) {
        return value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private String clean(String value) { return value.trim(); }

    private String cleanNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static class ConflictException extends RuntimeException {
        public ConflictException(String message) { super(message); }
    }

    public static class NotFoundException extends RuntimeException {
        public NotFoundException(String message) { super(message); }
    }
}
