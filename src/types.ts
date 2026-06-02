export type Service = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  birthDate?: string;
  notes?: string;
  lastVisit?: string;
};

export type Barber = {
  id: string;
  name: string;
  phone?: string;
  specialties?: string;
  active: boolean;
  comissao?: number;
  pin?: string;
  acesso?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
};

export type Appointment = {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  barberId?: string;
  date: string; // ISO string containing date and time
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
};

export type Product = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type Transaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  date: string; // ISO string
};

export type AppState = {
  services: Service[];
  appointments: Appointment[];
  products: Product[];
  transactions: Transaction[];
  clients: Client[];
  barbers: Barber[];
  isConnected: boolean;
};
