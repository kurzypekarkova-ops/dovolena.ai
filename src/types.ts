export interface SavedTrip {
  id: string;
  destination: string;
  days: number;
  companion: string;
  style: string;
  season?: string;
  type?: string;
  children?: boolean;
  itineraryText?: string;
  checklistText?: string;
  createdAt: string;
}

export interface Phrase {
  czech: string;
  foreign: string;
  pronunciation: string;
}

export interface ActiveTab {
  id: "itinerary" | "checklist" | "guide" | "roast";
  label: string;
  iconName: string;
}
