import { Router } from 'express';
import { prisma } from '@ecommerce-hr/db';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { executeAutomationEvent } from '../services/automation-executor.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

// GET / — list all calendar events
router.get('/', async (req, res) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { date: 'asc' },
    });
    successResponse(res, events);
  } catch (err) {
    errorResponse(res, 'FETCH_FAILED', 'Greška pri dohvaćanju događaja', 500);
  }
});

// POST / — create a new calendar event
router.post('/', async (req, res) => {
  try {
    const { title, description, date, endDate, location, isAutomationTrigger } = req.body;

    if (!title || !date) {
      errorResponse(res, 'VALIDATION_ERROR', 'Naziv i datum su obavezni', 400);
      return;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        isAutomationTrigger: isAutomationTrigger === true,
      },
    });

    successResponse(res, event, 201);
  } catch {
    errorResponse(res, 'CREATE_FAILED', 'Greška pri kreiranju događaja', 500);
  }
});

// PUT /:id — update a calendar event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, endDate, location, isAutomationTrigger } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(location !== undefined && { location: location || null }),
        ...(isAutomationTrigger !== undefined && { isAutomationTrigger }),
      },
    });

    successResponse(res, event);
  } catch {
    errorResponse(res, 'UPDATE_FAILED', 'Greška pri ažuriranju događaja', 500);
  }
});

// DELETE /:id — delete a calendar event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.calendarEvent.delete({ where: { id } });
    successResponse(res, { deleted: true });
  } catch {
    errorResponse(res, 'DELETE_FAILED', 'Greška pri brisanju događaja', 500);
  }
});

// POST /:id/trigger — manually trigger automation for this event
router.post('/:id/trigger', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.calendarEvent.findUnique({ where: { id } });

    if (!event) {
      errorResponse(res, 'NOT_FOUND', 'Događaj nije pronađen', 404);
      return;
    }

    if (!event.isAutomationTrigger) {
      errorResponse(res, 'NOT_TRIGGER', 'Ovaj događaj nije označen kao okidač za automatizaciju', 400);
      return;
    }

    // Get all active members to send event notifications
    const members = await prisma.member.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, userId: true },
    });

    let triggered = 0;
    for (const member of members) {
      executeAutomationEvent(`calendar_event.${id}`, {
        memberId: member.id,
        userId: member.userId,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date.toISOString(),
        eventLocation: event.location || '',
      }).catch((err) => {
        logger.error({ eventId: id, memberId: member.id, error: String(err) }, 'Calendar event trigger failed');
      });
      triggered++;
    }

    successResponse(res, { triggered, eventTitle: event.title });
  } catch {
    errorResponse(res, 'TRIGGER_FAILED', 'Greška pri pokretanju automatizacije', 500);
  }
});

export default router;
