import { describe, expect, it } from 'vitest'
import { createProject } from '../domain/project'
import { MemoryProjectRepository } from './repository'

describe('ProjectRepository contract', () => {
  it('saves and restores the last project', async () => {
    const repository = new MemoryProjectRepository()
    const project = createProject()
    await repository.save(project)
    expect(await repository.loadLast()).toEqual(project)
  })
})
