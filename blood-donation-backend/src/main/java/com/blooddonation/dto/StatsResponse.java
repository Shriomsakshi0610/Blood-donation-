package com.blooddonation.dto;

public record StatsResponse(
    long totalUsers,
    long registeredDonors,
    long bloodGroupsRepresented,
    Long totalDonations,
    Long livesSupported,
    Long partnerHospitals,
    Long donationCamps,
    boolean activeNowSupported
) {}
