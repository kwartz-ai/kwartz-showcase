import { defineVideo } from '../../src/index.ts'

export default defineVideo({
  name: 'fixture',
  baseUrl: 'http://localhost:9/',
  scenes: [{ id: 'one', say: 'Hello there.', run: async () => {} }],
})
