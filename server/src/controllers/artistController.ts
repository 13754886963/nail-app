import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Request } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getArtistProfile, getArtistStyles, updateArtist, findArtistByUserId, listArtists } from '../repositories/artistRepository';
import { toggleFollow, getFollowerCount, getMyFollowers } from '../repositories/followRepository';
import { getReceivedComments } from '../repositories/interactionRepository';

export async function listArtistsHandler(req: AuthRequest, res: Response): Promise<void> {
  const search = typeof req.query.q === 'string' ? req.query.q.trim() || undefined : undefined;
  const artists = await listArtists(req.userId, search);
  res.json({ success: true, data: artists });
}

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
  const artist = await findArtistByUserId(req.userId!);
  if (!artist) { res.status(404).json({ success: false, message: '美甲师档案不存在' }); return; }
  const profile = await getArtistProfile(artist.id, req.userId);
  res.json({ success: true, data: profile });
}

export async function getMyReceivedComments(req: AuthRequest, res: Response): Promise<void> {
  const comments = await getReceivedComments(req.userId!);
  res.json({ success: true, data: comments });
}

export async function getMyFollowersHandler(req: AuthRequest, res: Response): Promise<void> {
  const followers = await getMyFollowers(req.userId!);
  res.json({ success: true, data: followers });
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const profile = await getArtistProfile(id, req.userId);
  if (!profile) {
    res.status(404).json({ success: false, message: '美甲师不存在' });
    return;
  }
  res.json({ success: true, data: profile });
}

export async function getStyles(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const styles = await getArtistStyles(id);
  res.json({ success: true, data: styles });
}

export async function followArtist(req: AuthRequest, res: Response): Promise<void> {
  const { id: artistId } = req.params as { id: string };
  const profile = await getArtistProfile(artistId);
  if (!profile) {
    res.status(404).json({ success: false, message: '美甲师不存在' });
    return;
  }
  if (profile.user_id === req.userId) {
    res.status(400).json({ success: false, message: '不能关注自己' });
    return;
  }
  const isFollowed = await toggleFollow(req.userId!, profile.user_id);
  const followerCount = await getFollowerCount(profile.user_id);
  res.json({ success: true, data: { is_followed: isFollowed, follower_count: followerCount } });
}

export const updateArtistValidation = [
  body('bio').optional({ nullable: true }).isLength({ max: 500 }),
  body('years_of_experience').optional({ nullable: true }).isInt({ min: 0, max: 50 }),
  body('is_part_time').optional({ nullable: true }).isBoolean(),
];

export async function updateArtistProfile(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }
  const { bio, years_of_experience, is_part_time } = req.body as {
    bio?: string | null; years_of_experience?: number | null; is_part_time?: boolean;
  };
  await updateArtist(req.userId!, { bio, years_of_experience, is_part_time });
  res.json({ success: true });
}
