import { IDBFactory } from 'fake-indexeddb'
import { expect, test } from 'vitest'
import { createPracticeRepository } from './practice-repository'
import { createPractice } from '../../features/practice-library/create-practice'
import { readyScenes } from '../../content/scenes.catalog'
import { defaultGuide } from '../../content/guides/resolve-guide'

test('serialized writes restore the latest version and delete cannot resurrect old saves',async()=>{
  const factory=new IDBFactory(),repository=createPracticeRepository(factory,'test-practices')
  const session=createPractice(readyScenes[0],defaultGuide(readyScenes[0]))
  const old=repository.save(session)
  const next=repository.save({...session,baseWashVisible:false})
  await Promise.all([old,next])
  const reopened=createPracticeRepository(factory,'test-practices')
  expect((await reopened.list())[0]).toMatchObject({id:session.id,baseWashVisible:false})
  await repository.save(session);await repository.remove(session.id)
  expect(await reopened.list()).toEqual([])
})
