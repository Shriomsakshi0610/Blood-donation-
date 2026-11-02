package com.blooddonation.controller;

import com.blooddonation.dto.UserProfileResponse;
import com.blooddonation.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/health")
    public ResponseEntity<?> getAdminHealth() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemoryMb = runtime.totalMemory() / (1024 * 1024);
        long freeMemoryMb = runtime.freeMemory() / (1024 * 1024);
        long usedMemoryMb = totalMemoryMb - freeMemoryMb;

        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "server", "Spring Boot (Render)",
            "database", "Connected",
            "jvmUsedMemoryMb", usedMemoryMb,
            "jvmTotalMemoryMb", totalMemoryMb,
            "totalUsers", userRepository.count(),
            "adminCount", userRepository.countByRole("ADMIN")
        ));
    }

    @GetMapping("/users")
    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(UserProfileResponse::from)
            .toList();
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        long totalUsers = userRepository.count();
        long registeredDonors = userRepository.countByRole("USER");
        long distinctBloodGroups = userRepository.countDistinctBloodGroups();

        return ResponseEntity.ok(Map.of(
            "totalUsers", totalUsers,
            "registeredDonors", registeredDonors,
            "distinctBloodGroups", distinctBloodGroups,
            "adminCount", userRepository.countByRole("ADMIN")
        ));
    }
}
