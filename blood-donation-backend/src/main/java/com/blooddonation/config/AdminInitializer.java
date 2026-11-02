package com.blooddonation.config;

import com.blooddonation.model.BloodGroup;
import com.blooddonation.model.Gender;
import com.blooddonation.model.User;
import com.blooddonation.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Optional;

@Component
public class AdminInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String cleanEmail = (adminEmail != null) ? adminEmail.trim().toLowerCase(Locale.ROOT) : "";
        String cleanPassword = (adminPassword != null) ? adminPassword.trim() : "";

        boolean adminExists = userRepository.existsByRole("ADMIN");

        if (cleanEmail.isEmpty() || cleanPassword.isEmpty()) {
            if (!adminExists) {
                log.warn("[AdminInitializer] No administrator account currently exists and environment variables ADMIN_EMAIL / ADMIN_PASSWORD are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in environment variables (e.g. in Render) to initialize the single administrator.");
            } else {
                log.info("[AdminInitializer] Single administrator account already established in database.");
            }
            return;
        }

        if (cleanPassword.length() < 8) {
            log.error("[AdminInitializer] ADMIN_PASSWORD must be at least 8 characters long. Admin initialization skipped.");
            return;
        }

        // Check if an admin already exists in the database
        Optional<User> existingAdmin = userRepository.findFirstByRole("ADMIN");
        if (existingAdmin.isPresent()) {
            User admin = existingAdmin.get();
            // If the configured ADMIN_EMAIL matches the existing admin, verify/rotate password safely
            if (admin.getEmail().equalsIgnoreCase(cleanEmail)) {
                if (!passwordEncoder.matches(cleanPassword, admin.getPasswordHash())) {
                    admin.setPasswordHash(passwordEncoder.encode(cleanPassword));
                    userRepository.save(admin);
                    log.info("[AdminInitializer] Administrator password safely rotated for: {}", cleanEmail);
                } else {
                    log.info("[AdminInitializer] Administrator account is verified and up to date for: {}", cleanEmail);
                }
            } else {
                log.warn("[AdminInitializer] Exactly ONE admin account is permitted. An admin account already exists with email '{}'. Skipping creation of additional admin for '{}'.", admin.getEmail(), cleanEmail);
            }
            return;
        }

        // No admin account exists yet.
        // Check if an account already exists with the configured admin email:
        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setRole("ADMIN");
            user.setPasswordHash(passwordEncoder.encode(cleanPassword));
            userRepository.save(user);
            log.info("[AdminInitializer] Established existing account '{}' as the single administrator with updated credentials.", cleanEmail);
        } else {
            User admin = new User();
            admin.setFirstName("BloodConnect");
            admin.setMiddleName(null);
            admin.setLastName("Admin");
            admin.setFatherName(null);
            admin.setMotherName(null);
            admin.setEmail(cleanEmail);
            admin.setMobileNumber("9000000001");
            admin.setDateOfBirth(LocalDate.of(1990, 1, 1));
            admin.setBloodGroup(BloodGroup.O_POSITIVE);
            admin.setGender(Gender.OTHER);
            admin.setMedicalConditions("System Administrator");
            admin.setPasswordHash(passwordEncoder.encode(cleanPassword));
            admin.setConsentAccepted(true);
            admin.setConsentAcceptedAt(Instant.now());
            admin.setRole("ADMIN");

            userRepository.save(admin);
            log.info("[AdminInitializer] Single administrator account successfully created for: {}", cleanEmail);
        }
    }
}
