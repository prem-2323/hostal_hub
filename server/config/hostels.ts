export interface HostelBoundary {
    points: Array<{ latitude: number; longitude: number }>;
    center?: { latitude: number; longitude: number };
    radius?: number; // in meters
}

// Valluvar Mens Hostel coordinates (updated location)
const VALLUVAR_CONFIG = {
    points: [
        { latitude: 11.270432537516632, longitude: 77.60321287355816 },
        { latitude: 11.26989120133247, longitude: 77.60323906923166 },
        { latitude: 11.269871015895736, longitude: 77.60293033450834 },
        { latitude: 11.2704068470089, longitude: 77.60289291211764 },
    ],
    center: { latitude: 11.270233401520507, longitude: 77.60308379730445 },
    radius: 100, // 100 meters radius for precise geofencing
};

export const HOSTEL_LOCATIONS: Record<string, HostelBoundary> = {
    "Kaveri Ladies Hostel": { ...VALLUVAR_CONFIG },
    "Amaravathi Ladies Hostel": { ...VALLUVAR_CONFIG },
    "Bhavani Ladies Hostel": { ...VALLUVAR_CONFIG },
    "Dheeran Mens Hostel": { ...VALLUVAR_CONFIG },
    "Valluvar Mens Hostel": { ...VALLUVAR_CONFIG },
    "Ilango Mens Hostel": { ...VALLUVAR_CONFIG },
    "Bharathi Mens Hostel": { ...VALLUVAR_CONFIG },
    "Kamban Mens Hostel": { ...VALLUVAR_CONFIG },
    "Ponnar Mens Hostel": { ...VALLUVAR_CONFIG },
    "Sankar Mens Hostel": { ...VALLUVAR_CONFIG },
    "TEST - My Location": { ...VALLUVAR_CONFIG },
};
