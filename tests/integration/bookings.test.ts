import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicket,
  createPayment,
  createTicketTypeWithHotel,
  createHotel,
  createRoomWithHotelId,
  createBooking,
  createRoomWithHotelIdAndCapacity,
  createTicketTypeRemote,
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 200, booking id and room", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        id: createdBooking.id,
        Room: {
          id: createdRoom.id,
          name: createdRoom.name,
          capacity: createdRoom.capacity,
          hotelId: createdRoom.hotelId,
          createdAt: createdRoom.createdAt.toISOString(),
          updatedAt: createdRoom.updatedAt.toISOString(),
        },
      });
    });
    it("should respond with status 404 when user has no reservation", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      await createRoomWithHotelId(createdHotel.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 201 and create booking", async () => {
      const beforeCount = await prisma.booking.count();

      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room = await createRoomWithHotelId(createdHotel.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

      const afterCount = await prisma.booking.count();

      expect(response.status).toBe(httpStatus.CREATED);
      expect(beforeCount).toEqual(0);
      expect(afterCount).toEqual(1);
    });

    it("should respond with status 403 if the room's capacity limit is reached", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room = await createRoomWithHotelIdAndCapacity(createdHotel.id, 0);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if ticketType is remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room = await createRoomWithHotelId(createdHotel.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if ticket isnt paid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room = await createRoomWithHotelId(createdHotel.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if body is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      await createRoomWithHotelId(createdHotel.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send();

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if user doesnt have enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send();

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if room is not found", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      await createRoomWithHotelId(createdHotel.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: -1 });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/1");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 200 and bookingId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room1 = await createRoomWithHotelId(createdHotel.id);
      const room2 = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, room1.id);
      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: room2.id });
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: createdBooking.id });
    });

    it("should respond with status 403 if the room's capacity limit is reached", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room1 = await createRoomWithHotelId(createdHotel.id);
      const room2 = await createRoomWithHotelIdAndCapacity(createdHotel.id, 0);
      const createdBooking = await createBooking(user.id, room1.id);

      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: room2.id });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if room is not found", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room1 = await createRoomWithHotelId(createdHotel.id);
      const room2 = await createRoomWithHotelIdAndCapacity(createdHotel.id, 0);
      const createdBooking = await createBooking(user.id, room1.id);

      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: 0 });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 if user dosent have a booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const room = await createRoomWithHotelId(createdHotel.id);

      const response = await server.put(`/booking/0`).set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
  });
});
