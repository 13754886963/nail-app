import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  listArtistsHandler,
  getMyProfile,
  getMyReceivedComments,
  getMyFollowersHandler,
  getProfile,
  getStyles,
  followArtist,
  updateArtistProfile,
  updateArtistValidation,
} from '../controllers/artistController';
import { listArtistReviews } from '../controllers/reviewController';
import {
  getAvailability,
  getMyAvailability,
  setAvailability,
  setAvailabilityValidation,
} from '../controllers/availabilityController';

const router = Router();

router.get('/',                        authenticate, listArtistsHandler);
router.get('/me',                      authenticate, getMyProfile);
router.get('/me/received-comments',    authenticate, getMyReceivedComments);
router.get('/me/followers',            authenticate, getMyFollowersHandler);
router.get('/me/availability',         authenticate, getMyAvailability);
router.patch('/me',                    authenticate, updateArtistValidation, updateArtistProfile);
router.put('/me/availability',         authenticate, setAvailabilityValidation, setAvailability);
router.get('/:id',                     authenticate, getProfile);
router.get('/:id/styles',              authenticate, getStyles);
router.post('/:id/follow',             authenticate, followArtist);
router.get('/:id/reviews',             authenticate, listArtistReviews);
router.get('/:id/availability',        authenticate, getAvailability);

export default router;
