export type Mission = {
  id: string;
  slug: string;
  title: string;
  color: string | null;
};

export type Place = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  prefecture?: string | null;
  address?: string | null;
};

export type MissionPlaceFeature = {
  place: Place;
  missionSlugs: string[];
};

export type ProgressMissionEntry = {
  total: number;
  completed: number;
  visitedPlaceIds: string[];
};

export type ProgressResponse = {
  byMission: Record<string, ProgressMissionEntry>;
  visitedAllPlaceIds: string[];
};

export type VisitPayload = {
  place_id: string;
  visited_at?: string | null;
  note?: string | null;
};

export type SignedUrlRequestFile = {
  name: string;
  type: string;
};

export type SignedUrlResponse = {
  path: string;
  url: string;
};

export type CertificateResponse = {
  url: string;
};

export type BoundingBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};
