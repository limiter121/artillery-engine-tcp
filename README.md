# Artillery.io TCP Plugin

<p align="center">
    <em>Load test TCP with <a href="https://artillery.io">Artillery.io</a></em>
</p>

Based on the [AWS Lambda Engine by orchestrated.io](https://github.com/orchestrated-io/artillery-engine-lambda).

## Usage

**Important:** The plugin requires Artillery `1.5.8-3` or higher.

### Install the plugin

```
# If Artillery is installed globally:
npm install -g artillery-engine-tcp
```

### Use the plugin

1. Set `config.target` to the host address of the TCP server
2. Specify additional options in `config.tcp`:
    - `port` - number (**required**)
3. Set the `engine` property of the scenario to `tcp`.
4. Use `send` in your scenario to send arbitrary data to the server
5. Specify additional invocation parameters:
    - `payload` - String or object (gets converted to JSON string) with the payload to send
    - `encoding` - Payload string encoding. Defaults to `utf8`. See [Buffer.from(*string*)](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_string_encoding).

*Note:* The TCP server must respond (with anything) to each `send` command in order for the request to finish.

#### Example Script

```yaml
config:
  target: "localhost"
  tcp:
    port: 1234
  phases:
    - arrivalCount: 10
      duration: 1
  engines:
    tcp: {}

scenarios:
  - name: "Send data"
    engine: tcp
    flow:
      - count: 10
        loop:
        - send:
            payload: "hello world"
        - think: 1
        - send:
            payload: "1111111111"
            encoding: "hex"
        - think: 1
```

### Run Your Script

```
artillery run my_script.yml
```

### License

[MPL 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
