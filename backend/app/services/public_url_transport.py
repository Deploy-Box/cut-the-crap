"""HTTP transport that connects only to validated public addresses."""

import asyncio
import ipaddress
import socket
import ssl

import httpx


class UnsafeDestinationError(httpx.ConnectError):
    pass


class PublicURLTransport(httpx.AsyncBaseTransport):
    def __init__(self, *, verify: bool | ssl.SSLContext = True):
        self._transport = httpx.AsyncHTTPTransport(
            verify=verify,
            trust_env=False,
            limits=httpx.Limits(max_keepalive_connections=0),
        )

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        if request.url.scheme not in ("http", "https") or not request.url.host:
            raise UnsafeDestinationError("Only public HTTP URLs are allowed", request=request)

        hostname = request.url.raw_host.decode("ascii")
        address = await self._resolve_public_address(request)
        pinned = httpx.Request(
            method=request.method,
            url=request.url.copy_with(host=address),
            headers=request.headers,
            stream=request.stream,
            extensions={**request.extensions, "sni_hostname": hostname},
        )
        return await self._transport.handle_async_request(pinned)

    async def _resolve_public_address(self, request: httpx.Request) -> str:
        hostname = request.url.raw_host.decode("ascii")
        port = request.url.port or (443 if request.url.scheme == "https" else 80)
        timeout = request.extensions.get("timeout", {}).get("connect")
        try:
            results = await asyncio.wait_for(
                asyncio.get_running_loop().getaddrinfo(
                    hostname, port, type=socket.SOCK_STREAM,
                ),
                timeout=timeout,
            )
        except asyncio.TimeoutError as exc:
            raise httpx.ConnectTimeout("DNS lookup timed out", request=request) from exc
        except OSError as exc:
            raise httpx.ConnectError("DNS lookup failed", request=request) from exc

        addresses = [ipaddress.ip_address(result[4][0]) for result in results]
        if not addresses or any(
            not address.is_global or str(address) == "168.63.129.16"
            for address in addresses
        ):
            raise UnsafeDestinationError("URL resolves to a non-public address", request=request)

        return str(addresses[0])

    async def aclose(self) -> None:
        await self._transport.aclose()
