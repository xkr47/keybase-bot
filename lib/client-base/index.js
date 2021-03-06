// @flow
import type {ChildProcess} from 'child_process'
import {formatAPIObjectInput, formatAPIObjectOutput, keybaseExec, keybaseStatus} from '../utils'
import {API_VERSIONS, type API_TYPES} from '../constants'

export type Initialized = false | 'paperkey' | 'currentService'

export type InitOptions = {|
  verbose?: boolean,
|}

export type ApiCommandArg = {|apiName: API_TYPES, method: string, options?: Object|}

/**
 * A Client base.
 * @ignore
 */
class ClientBase {
  initialized: Initialized
  username: void | string
  devicename: void | string
  homeDir: void | string
  verbose: boolean
  spawnedProcesses: ChildProcess[]

  constructor() {
    this.initialized = false
    this.verbose = false
    this.spawnedProcesses = []
  }

  async _init(homeDir: void | string, options?: InitOptions): Promise<void> {
    const initBotInfo = await keybaseStatus(homeDir)
    this.homeDir = homeDir
    this.username = initBotInfo.username
    this.devicename = initBotInfo.devicename
  }

  async _deinit(): Promise<void> {
    for (const child of this.spawnedProcesses) {
      child.kill()
    }
  }

  async _runApiCommand(arg: ApiCommandArg): Promise<any> {
    const options = arg.options ? formatAPIObjectInput(arg.options, arg.apiName) : undefined
    const input = {
      method: arg.method,
      params: {
        version: API_VERSIONS[arg.apiName],
        options,
      },
    }
    const inputString = JSON.stringify(input)
    const size = inputString.length
    const output = await keybaseExec(this.homeDir, [arg.apiName, 'api'], {
      stdinBuffer: Buffer.alloc(size, inputString, 'utf8'),
      json: true,
    })
    if (output.hasOwnProperty('error')) {
      throw new Error(output.error.message)
    }
    const res = formatAPIObjectOutput(output.result)
    return res
  }

  async _guardInitialized(): Promise<void> {
    const status = await keybaseStatus(this.homeDir)
    if (!this.username || status.username !== this.username || status.devicename !== this.devicename) {
      throw new Error('The bot service has changed since this bot was spawned.')
    }
  }
}

export default ClientBase
