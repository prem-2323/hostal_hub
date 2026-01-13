export interface HostelBoundary {
    points: Array<{ latitude: number; longitude: number }>;
    center?: { latitude: number; longitude: number };
    radius?: number;
}

export const HOSTEL_CODES: Record<string, string> = {
    "Kaveri Ladies Hostel": "girls 2547",
    "Amaravathi Ladies Hostel": "ladies 9021",
    "Bhavani Ladies Hostel": "ladies 3341",
    "Dheeran Mens Hostel": "mens 4452",
    "Valluvar Mens Hostel": "mens 1123",
    "Ilango Mens Hostel": "mens 7789",
    "Bharathi Mens Hostel": "mens 5564",
    "Kamban Mens Hostel": "mens 8891",
    "Ponnar Mens Hostel": "mens 1002",
    "Sankar Mens Hostel": "mens 9987",
};

export const HOSTEL_BLOCKS = Object.keys(HOSTEL_CODES);

// Hostel location boundaries for geofencing
const COMMON_CONFIG: HostelBoundary = {
    points: [
        { latitude: 11.144133685376177, longitude: 77.32563956861075 },
        { latitude: 11.14409414234636, longitude: 77.32570506094395 },
        { latitude: 11.14401011339013, longitude: 77.32565468222612 },
        { latitude: 11.144042242111555, longitude: 77.32559674670058 },
    ],
    center: { latitude: 11.14407004575, longitude: 77.3256515145 },
    radius: 2000,
};

// Valluvar Mens Hostel location (user's actual location)
// Individual point radii: Point 1=200m, Point 2=400m, Point 3=300m, Point 4=500m, Point 5=100m
const VALLUVAR_CONFIG: HostelBoundary = {
    points: [
        { latitude: 11.273458896122523, longitude: 77.60649425525024 },
        { latitude: 11.27341680881379, longitude: 77.60733915107322 },
        { latitude: 11.273764028926491, longitude: 77.60702801483365 },
        { latitude: 11.27316691529131, longitude: 77.60702265041573 },
        { latitude: 11.273461526579116, longitude: 77.60701460378884 },
    ],
    center: { latitude: 11.273453635146646, longitude: 77.60697973507233 },
    radius: 1000, // 1000 meters radius for center-based geofencing
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
