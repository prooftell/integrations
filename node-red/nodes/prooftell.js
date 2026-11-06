// The ProofTell nodes for Node-RED. `prooftell-config` is the connection: the API key, kept in Node-RED's credentials
// store (never in the flow's JSON), and a label, live or sandbox, the editor reads from the key's prefix. `prooftell`
// runs one of the four checks per message: each input is read from the node's field (a TypedInput: a fixed value, a
// message property, a flow or global context value, an environment variable), and for the three single checks a
// string `msg.payload` is the value when the field gives nothing; the api's answer, unchanged, goes into the output
// property (`msg.payload` by default). A failed check is the api's message as the node's error, for a Catch node, with
// `msg.statusCode` set; the message goes on to no output. What each call does and costs: https://prooftell.com/docs.
'use strict'

const { ACTIONS, bodyFor, call, summary } = require('./lib/client')

const INPUTS = ['phone', 'email', 'ip', 'country', 'reference']

module.exports = function (RED) {
  function ProoftellConfigNode (config) {
    RED.nodes.createNode(this, config)
    this.name = config.name
    this.mode = config.mode
  }
  RED.nodes.registerType('prooftell-config', ProoftellConfigNode, {
    credentials: { apiKey: { type: 'password' } },
  })

  /** A TypedInput's value for this message; undefined when the field is empty or the message lacks the property. */
  function evaluate (node, value, type, msg) {
    if (value === undefined || value === null || value === '') return Promise.resolve(undefined)
    if ((type || 'str') === 'msg') {
      // Node-RED throws on a path through a missing property (payload.phone with no payload): a field with nothing in it.
      try {
        return Promise.resolve(RED.util.getMessageProperty(msg, value))
      } catch {
        return Promise.resolve(undefined)
      }
    }
    return new Promise((resolve, reject) => {
      RED.util.evaluateNodeProperty(value, type || 'str', node, msg, (err, result) => (err ? reject(err) : resolve(result)))
    })
  }

  function ProoftellNode (config) {
    RED.nodes.createNode(this, config)
    const node = this
    const connection = RED.nodes.getNode(config.connection)
    const action = ACTIONS[config.action] ? config.action : 'phone'

    node.on('input', async (msg, send, done) => {
      try {
        const values = { level: config.level || undefined, timeout: config.timeout === '' ? undefined : config.timeout }
        for (const input of INPUTS) {
          values[input] = await evaluate(node, config[input], config[input + 'Type'], msg)
        }
        const required = ACTIONS[action].required
        if (required && (values[required] === undefined || values[required] === '') && typeof msg.payload === 'string') {
          values[required] = msg.payload
        }
        const body = bodyFor(action, values)
        if (!connection) throw new Error('No ProofTell connection: pick one in the node, with its key.')
        const key = connection.credentials && connection.credentials.apiKey
        node.status({ fill: 'blue', shape: 'dot', text: 'checking' })
        const answer = await call({ key, action, body })
        RED.util.setMessageProperty(msg, config.output || 'payload', answer, true)
        node.status({ fill: 'green', shape: 'dot', text: summary(action, answer) })
        send(msg)
        done()
      } catch (err) {
        if (err.status) msg.statusCode = err.status
        node.status({ fill: 'red', shape: 'ring', text: err.code || 'error' })
        done(err)
      }
    })

    node.on('close', () => node.status({}))
  }
  RED.nodes.registerType('prooftell', ProoftellNode)
}
