import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  bookAppointment,
  myAppointments,
  incomingAppointments,
  getAppointment,
  changeStatus,
  createAppointmentValidation,
  updateStatusValidation,
} from '../controllers/appointmentController';
import {
  submitReview,
  getAppointmentReview,
  replyToReview,
  createReviewValidation,
  replyValidation,
} from '../controllers/reviewController';

const router = Router();

router.post('/',              authenticate, createAppointmentValidation, bookAppointment);
router.get('/my',             authenticate, myAppointments);
router.get('/incoming',       authenticate, incomingAppointments);
router.get('/:id',            authenticate, getAppointment);
router.patch('/:id/status',   authenticate, updateStatusValidation, changeStatus);
router.post('/:id/review',       authenticate, createReviewValidation, submitReview);
router.get('/:id/review',        authenticate, getAppointmentReview);
router.patch('/:id/review/reply', authenticate, replyValidation, replyToReview);

export default router;
