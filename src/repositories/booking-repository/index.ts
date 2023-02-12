import { prisma } from "@/config";

async function findBooking(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId,
    },
    select: {
      id: true,
      Room: true,
    },
  });
}

async function findRoom(id: number) {
  return prisma.room.findFirst({
    where: {
      id,
    },
  });
}

async function reserveRoom(id: number) {
  return prisma.room.update({
    where: {
      id,
    },
    data: {
      capacity: {
        decrement: 1,
      },
    },
  });
}

async function unbookRoom(id: number) {
  return prisma.room.update({
    where: {
      id,
    },
    data: {
      capacity: {
        increment: 1,
      },
    },
  });
}

async function createBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,
    },
  });
}

async function updateBooking(id: number, roomId: number) {
  return prisma.booking.update({
    where: {
      id,
    },
    data: {
      roomId,
    },
  });
}

const bookingRepository = {
  findBooking,
  createBooking,
  findRoom,
  reserveRoom,
  unbookRoom,
  updateBooking,
};

export default bookingRepository;
