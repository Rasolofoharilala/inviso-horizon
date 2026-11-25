import test from 'node:test'
import assert from 'node:assert/strict'
import { navigation, getNavigationModules, navigationItemActive } from '../src/config/navigation.ts'
test('module Lots avec quatre pages réelles',()=>{
  const module=getNavigationModules().find((item)=>item.id==='Lots')
  assert.deepEqual(module.items.map((item)=>item.path),['/lots','/lots/historique','/lots/chronologie','/lots/evolution'])
  assert.ok(module.items.every((item)=>item.page!=='placeholder'))
})
test('la fiche conserve le module Lots et les sous-pages ont leur propre sélection',()=>{
  const list=navigation.find((item)=>item.path==='/lots')
  assert.equal(navigationItemActive(list,'/lots/123'),true)
  assert.equal(navigationItemActive(list,'/lots/historique'),false)
  assert.equal(navigationItemActive(list,'/lots-autres'),false)
  const history=navigation.find((item)=>item.path==='/lots/historique')
  assert.equal(navigationItemActive(history,'/lots/historique'),true)
})
