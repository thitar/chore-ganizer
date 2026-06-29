import { Router } from 'express'
import healthRouter from './health.routes'
import authRouter from './auth.routes'
import templatesRouter from './templates.routes'
import assignmentsRouter from './assignments.routes'
import usersRouter from './users.routes'
import recurringRouter from './recurring.routes'
import occurrencesRouter from './occurrences.routes'
import pointsRouter from './points.routes'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/templates', templatesRouter)
router.use('/assignments', assignmentsRouter)
router.use('/users', usersRouter)
router.use('/recurring', recurringRouter)
router.use('/occurrences', occurrencesRouter)
router.use('/points', pointsRouter)

export default router
