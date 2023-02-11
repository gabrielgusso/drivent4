import { prisma } from "@/config";

async function findBooking(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId,
    },
    select: {
      id: true,
      Room: true
    }
  })
}

async function findRoom(id: number) {
  return prisma.room.findFirst({
    where: {
      id,
    }
  })
}

async function createBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId
    }
  })
}


const bookingRepository = {
  findBooking,
  createBooking,
  findRoom
};

export default bookingRepository;
