package com.blooddonation.controller;

import com.blooddonation.dto.UpdateProfileRequest;
import com.blooddonation.dto.UserProfileResponse;
import com.blooddonation.model.User;
import com.blooddonation.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final AuthService authService;

    public ProfileController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public UserProfileResponse getProfile(Authentication authentication) {
        return UserProfileResponse.from(authService.getByEmail(authentication.getName()));
    }

    @PutMapping
    public UserProfileResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        User updated = authService.updateProfile(authentication.getName(), request);
        return UserProfileResponse.from(updated);
    }
}
