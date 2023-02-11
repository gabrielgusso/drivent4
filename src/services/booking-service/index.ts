import bookingRepository from '@/repositories/booking-repository';
import { notFoundError } from '@/errors';
import enrollmentRepository from '@/repositories/enrollment-repository';
import ticketRepository from '@/repositories/ticket-repository';

async function listBooking(userId: number) {
  const booking = await bookingRepository.findBooking(userId);
  if (!booking) {
    throw notFoundError();
  }
  return booking;
}

async function regisdterBooking(userId: number, roomId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw { message: 'invalid enrollment' };
  }
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
  if (ticket.TicketType.isRemote || !ticket.TicketType.includesHotel || ticket.status === 'RESERVED') {
    throw { message: 'invalid ticket' };
  }
  const room = await bookingRepository.findRoom(roomId);
  if (!room) {
    throw notFoundError();
  }
  if (room.capacity === 0) {
    throw { message: 'capacity limit reached' };
  }
  const booking = await bookingRepository.createBooking(userId, roomId);
  return booking;
}

const bookingService = {
  listBooking,
  regisdterBooking,
};

export default bookingService;
