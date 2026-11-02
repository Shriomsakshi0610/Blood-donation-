package com.blooddonation.dto;

import com.blooddonation.model.BloodGroup;
import com.blooddonation.model.Gender;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record UpdateProfileRequest(
    @NotBlank @Size(max = 80) String firstName,
    @Size(max = 80) String middleName,
    @NotBlank @Size(max = 80) String lastName,
    @Size(max = 160) String fatherName,
    @Size(max = 160) String motherName,
    @NotBlank @Pattern(regexp = "^[6-9][0-9]{9}$") String mobileNumber,
    @NotNull @Past LocalDate dateOfBirth,
    @NotNull BloodGroup bloodGroup,
    @NotNull Gender gender,
    @Size(max = 2000) String medicalConditions
) {}
