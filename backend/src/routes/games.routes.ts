import { Router } from 'express'
import * as gamesService from '../services/games.service'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { pongScoreSchema } from '../schemas/games.schema'

const router = Router()

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const games = await gamesService.getGames(req.session.userId!, req.session.role!)
    res.json({ success: true, data: games, error: null })
  } catch (err) {
    next(err)
  }
})

router.post('/pong/scores', authenticate, validate(pongScoreSchema), async (req, res, next) => {
  try {
    const result = await gamesService.recordPongScore(req.session.userId!, req.session.role!, req.body.score)
    res.status(201).json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
