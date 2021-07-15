import { multiaddr } from 'multiaddr';
import PeerId from 'peer-id';
import { Environment, Waku } from 'js-waku';

function help(): string[] {
  return [
    '/nick <nickname>: set a new nickname',
    '/info: some information about the node',
    '/connect <Multiaddr>: connect to the given peer',
    '/fleet <prod|test>: connect to this fleet; beware it restarts waku node.',
    '/help: Display this help',
  ];
}

function nick(
  nick: string | undefined,
  setNick: (nick: string) => void
): string[] {
  if (!nick) {
    return ['No nick provided'];
  }
  setNick(nick);
  return [`New nick: ${nick}`];
}

function info(waku: Waku | undefined, fleetEnv: Environment): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  return [
    `PeerId: ${waku.libp2p.peerId.toB58String()}`,
    `Fleet environment: ${fleetEnv}`,
  ];
}

function connect(peer: string | undefined, waku: Waku | undefined): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  if (!peer) {
    return ['No peer provided'];
  }
  try {
    const peerMultiaddr = multiaddr(peer);
    const peerId = peerMultiaddr.getPeerId();
    if (!peerId) {
      return ['Peer Id needed to dial'];
    }
    waku.addPeerToAddressBook(PeerId.createFromB58String(peerId), [
      peerMultiaddr,
    ]);
    return [
      `${peerId}: ${peerMultiaddr.toString()} added to address book, autodial in progress`,
    ];
  } catch (e) {
    return ['Invalid multiaddr: ' + e];
  }
}

function peers(waku: Waku | undefined): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  let response: string[] = [];
  waku.libp2p.peerStore.peers.forEach((peer, peerId) => {
    response.push(peerId + ':');
    let addresses = '  addresses: [';
    peer.addresses.forEach(({ multiaddr }) => {
      addresses += ' ' + multiaddr.toString() + ',';
    });
    addresses = addresses.replace(/,$/, '');
    addresses += ']';
    response.push(addresses);
    let protocols = '  protocols: [';
    protocols += peer.protocols;
    protocols += ']';
    response.push(protocols);
  });
  if (response.length === 0) {
    response.push('Not connected to any peer.');
  }
  return response;
}

function fleet(
  newFleetEnv: string | undefined,
  currFleetEnv: Environment,
  setFleetEnv: (fleetEnv: Environment) => void
): string[] {
  switch (newFleetEnv) {
    case Environment.Test:
      setFleetEnv(newFleetEnv);
      break;
    case Environment.Prod:
      setFleetEnv(newFleetEnv);
      break;
    default:
      return [
        `Incorrect values, acceptable values are ${Environment.Test}, ${Environment.Prod}`,
        `Current fleet environment is ${currFleetEnv}`,
      ];
  }

  return [`New fleet Environment: ${newFleetEnv}`];
}

function connections(waku: Waku | undefined): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  let response: string[] = [];
  waku.libp2p.connections.forEach(
    (
      connections: import('libp2p-interfaces/src/connection/connection')[],
      peerId
    ) => {
      response.push(peerId + ':');
      let strConnections = '  connections: [';
      connections.forEach((connection) => {
        strConnections += JSON.stringify(connection.stat);
        strConnections += '; ' + JSON.stringify(connection.streams);
      });
      strConnections += ']';
      response.push(strConnections);
    }
  );
  if (response.length === 0) {
    response.push('Not connected to any peer.');
  }
  return response;
}

export default function handleCommand(
  input: string,
  waku: Waku | undefined,
  setNick: (nick: string) => void,
  currFleetEnv: Environment,
  setFleetEnv: (fleetEnv: Environment) => void
): { command: string; response: string[] } {
  let response: string[] = [];
  const args = parseInput(input);
  const command = args.shift()!;
  switch (command) {
    case '/help':
      help().map((str) => response.push(str));
      break;
    case '/nick':
      nick(args.shift(), setNick).map((str) => response.push(str));
      break;
    case '/info':
      info(waku, currFleetEnv).map((str) => response.push(str));
      break;
    case '/connect':
      connect(args.shift(), waku).map((str) => response.push(str));
      break;
    case '/peers':
      peers(waku).map((str) => response.push(str));
      break;
    case '/connections':
      connections(waku).map((str) => response.push(str));
      break;
    case '/fleet':
      fleet(args.shift(), currFleetEnv, setFleetEnv).map((str) =>
        response.push(str)
      );
      break;
    default:
      response.push(`Unknown Command '${command}'`);
  }
  return { command, response };
}

export function parseInput(input: string): string[] {
  const clean = input.trim().replaceAll(/\s\s+/g, ' ');
  return clean.split(' ');
}
