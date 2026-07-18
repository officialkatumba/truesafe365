module.exports = {
  pre_trip_fatigue: {
    label: "Driver Pre-Trip Fatigue Checklist",
    items: [
      { code: "FAT-1", question: "Did you get at least 6 hours of sleep before this shift?", critical: true },
      { code: "FAT-2", question: "Do you feel alert and fit to drive right now?", critical: true },
      { code: "FAT-3", question: "Are you free from alcohol, drugs, or medication that could affect your driving?", critical: true },
      { code: "FAT-4", question: "Have you had a break within the last 4 hours of driving/working?", critical: false },
      { code: "FAT-5", question: "Is this shift within the legal/company driving-hours limit for the day?", critical: true },
      { code: "FAT-6", question: "Are you free from personal stress or distraction that could affect concentration?", critical: false },
      { code: "FAT-7", question: "Do you know the planned route, expected hazards, and rest stops for this haul?", critical: false },
    ],
  },
  pre_start_inspection: {
    label: "Pre-Start Vehicle Safety Inspection",
    items: [
      { code: "VEH-1", question: "Tyres (including spare) are in good condition and correctly inflated", critical: true },
      { code: "VEH-2", question: "Brakes (service and park) are working correctly", critical: true },
      { code: "VEH-3", question: "Steering feels normal with no excessive play", critical: true },
      { code: "VEH-4", question: "All lights, indicators, and hazard lights are working", critical: true },
      { code: "VEH-5", question: "Mirrors are clean, adjusted, and undamaged", critical: false },
      { code: "VEH-6", question: "Windscreen, wipers, and washers are functional and view is unobstructed", critical: false },
      { code: "VEH-7", question: "Horn is working", critical: false },
      { code: "VEH-8", question: "Seatbelts are present and functional for all seating positions", critical: true },
      { code: "VEH-9", question: "Fuel, engine oil, coolant, and hydraulic fluid levels are adequate", critical: false },
      { code: "VEH-10", question: "Fire extinguisher, first aid kit, and warning triangle/reflectors are on board and in date", critical: true },
      { code: "VEH-11", question: "Load is properly secured and within the vehicle's rated capacity", critical: true },
      { code: "VEH-12", question: "No visible fluid leaks, damaged bodywork, or exposed wiring", critical: false },
    ],
  },
};
