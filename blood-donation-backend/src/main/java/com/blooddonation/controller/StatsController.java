package com.blooddonation.controller;

import com.blooddonation.dto.StatsResponse;
import com.blooddonation.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {
    private final UserRepository userRepository;

    public StatsController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public StatsResponse getPublicStats() {
        long totalUsers = userRepository.count();
        long registeredDonors = userRepository.countByRole("USER");
        long bloodGroupsRepresented = userRepository.countDistinctBloodGroups();

        // Schema limitations handled honestly:
        // Donation records, lives saved, partner hospitals and camps are not currently
        // backed by tables in the schema, so null is returned rather than fabricated counts.
        return new StatsResponse(
            totalUsers,
            registeredDonors,
            bloodGroupsRepresented,
            null, // totalDonations (no table in current schema)
            null, // livesSupported (requires verified donation records table)
            null, // partnerHospitals (no table in current schema)
            null, // donationCamps (no table in current schema)
            false // activeNowSupported (real-time presence tracking not supported)
        );
    }
}
