import { base44 } from '@/api/base44Client';

// Thin, named bindings to each entity's collection API, so pages import
// `Job`, `Property`, etc. rather than reaching into base44.entities directly.
export const Company = base44.entities.Company;
export const Customer = base44.entities.Customer;
export const Property = base44.entities.Property;
export const Staff = base44.entities.Staff;
export const Job = base44.entities.Job;
export const Room = base44.entities.Room;
export const ClockEvent = base44.entities.ClockEvent;
export const Report = base44.entities.Report;
export const Availability = base44.entities.Availability;
export const LeaveRequest = base44.entities.LeaveRequest;
export const AppUser = base44.entities.User;
export const Document = base44.entities.Document;
export const Dispute = base44.entities.Dispute;
export const Invoice = base44.entities.Invoice;
