import Dexie, { type EntityTable } from 'dexie'
import { parseProjectFile, toProjectFile } from '../domain/project'
import type { PatternProject, ProjectRepository } from '../domain/types'

type Record = { id: string; updatedAt: string; project: PatternProject }
class KnitDatabase extends Dexie {
  projects!: EntityTable<Record, 'id'>
  constructor() {
    super('knit-canvas')
    this.version(1).stores({ projects: 'id, updatedAt' })
  }
}

export class DexieProjectRepository implements ProjectRepository {
  private db = new KnitDatabase()
  async loadLast() {
    const project = (await this.db.projects.orderBy('updatedAt').last())
      ?.project
    return project
      ? parseProjectFile(toProjectFile(project)).project
      : undefined
  }
  async save(project: PatternProject) {
    await this.db.projects.put({
      id: project.id,
      updatedAt: project.updatedAt,
      project,
    })
  }
}

export class MemoryProjectRepository implements ProjectRepository {
  project?: PatternProject
  async loadLast() {
    return this.project
  }
  async save(project: PatternProject) {
    this.project = structuredClone(project)
  }
}

export const projectRepository: ProjectRepository = new DexieProjectRepository()
