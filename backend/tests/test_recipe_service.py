"""Tests for app.services.recipe_service – HTML helpers (pure) and async service functions."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.recipe_service import (
    _remove_tag_blocks,
    extract_title,
    extract_visible_text,
    call_openai_chat,
    fetch_and_extract,
    count_saved_recipes,
    find_saved_recipe_duplicate,
    get_saved_recipes,
    get_saved_recipe_by_id,
    create_saved_recipe,
)
from tests.conftest import make_record


# ═════════════════════════════════════════════════════════════════════
# Pure function tests – HTML helpers
# ═════════════════════════════════════════════════════════════════════


class TestRemoveTagBlocks:
    def test_removes_script_tags(self):
        html = '<p>Hello</p><script>alert("x")</script><p>World</p>'
        result = _remove_tag_blocks(html, "script")
        assert "alert" not in result
        assert "Hello" in result
        assert "World" in result

    def test_removes_tags_with_attributes(self):
        html = '<style type="text/css">.red { color: red; }</style><p>Keep</p>'
        result = _remove_tag_blocks(html, "style")
        assert ".red" not in result
        assert "Keep" in result

    def test_case_insensitive(self):
        html = "<SCRIPT>bad</SCRIPT><p>good</p>"
        result = _remove_tag_blocks(html, "script")
        assert "bad" not in result
        assert "good" in result

    def test_multiple_occurrences(self):
        html = "<nav>nav1</nav><p>mid</p><nav>nav2</nav>"
        result = _remove_tag_blocks(html, "nav")
        assert "nav1" not in result
        assert "nav2" not in result
        assert "mid" in result

    def test_no_matching_tags(self):
        html = "<p>Nothing to remove</p>"
        result = _remove_tag_blocks(html, "script")
        assert "Nothing to remove" in result

    def test_nested_content(self):
        html = "<style><div>inner</div></style><p>outer</p>"
        result = _remove_tag_blocks(html, "style")
        assert "inner" not in result
        assert "outer" in result


class TestExtractTitle:
    def test_extracts_simple_title(self):
        html = "<html><head><title>My Recipe Page</title></head></html>"
        assert extract_title(html, "fallback") == "My Recipe Page"

    def test_returns_fallback_when_no_title(self):
        html = "<html><head></head></html>"
        assert extract_title(html, "https://example.com") == "https://example.com"

    def test_returns_fallback_when_title_empty(self):
        html = "<html><title>   </title></html>"
        assert extract_title(html, "fallback") == "fallback"

    def test_unescapes_html_entities(self):
        html = "<title>Mac &amp; Cheese &#8211; Best Ever</title>"
        result = extract_title(html, "")
        assert "&amp;" not in result
        assert "Mac & Cheese" in result

    def test_normalizes_whitespace(self):
        html = "<title>  Lots   of   spaces  </title>"
        assert extract_title(html, "") == "Lots of spaces"

    def test_case_insensitive_tag(self):
        html = "<TITLE>Upper Case</TITLE>"
        assert extract_title(html, "fallback") == "Upper Case"

    def test_title_with_attributes(self):
        html = '<title lang="en">My Title</title>'
        assert extract_title(html, "fallback") == "My Title"


class TestExtractVisibleText:
    def test_strips_script_and_style(self):
        html = "<p>Hello</p><script>evil()</script><style>.x{}</style><p>World</p>"
        result = extract_visible_text(html)
        assert "evil" not in result
        assert ".x" not in result
        assert "Hello" in result
        assert "World" in result

    def test_strips_structural_tags(self):
        html = "<header>Header</header><main><p>Content</p></main><footer>Footer</footer>"
        result = extract_visible_text(html)
        assert "Header" not in result
        assert "Footer" not in result
        assert "Content" in result

    def test_removes_html_comments(self):
        html = "<p>Before</p><!-- This is a comment --><p>After</p>"
        result = extract_visible_text(html)
        assert "comment" not in result
        assert "Before" in result
        assert "After" in result

    def test_br_and_hr_become_newlines(self):
        html = "Line1<br>Line2<hr/>Line3"
        result = extract_visible_text(html)
        assert "Line1" in result
        assert "Line2" in result
        assert "Line3" in result

    def test_block_tags_create_newlines(self):
        html = "<div>First</div><p>Second</p>"
        result = extract_visible_text(html)
        lines = result.strip().split("\n")
        assert len(lines) >= 2

    def test_decodes_html_entities(self):
        html = "<p>Fish &amp; Chips &lt;3</p>"
        result = extract_visible_text(html)
        assert "Fish & Chips <3" in result

    def test_deduplicates_identical_lines(self):
        html = "<p>Same</p><p>Same</p><p>Same</p><p>Different</p>"
        result = extract_visible_text(html)
        assert result.count("Same") == 1
        assert "Different" in result

    def test_empty_html(self):
        assert extract_visible_text("") == ""

    def test_whitespace_only_html(self):
        html = "   <span>   </span>   "
        assert extract_visible_text(html).strip() == ""

    def test_complex_real_world_snippet(self):
        html = """
        <html>
        <head><script>ga('send', 'pageview');</script></head>
        <body>
            <nav><a href="/">Home</a></nav>
            <div class="recipe">
                <h1>Chocolate Cake</h1>
                <p>Mix flour and cocoa.</p>
                <p>Bake at 350&deg;F for 30 minutes.</p>
            </div>
            <footer>&copy; 2025 Recipes Inc.</footer>
        </body>
        </html>
        """
        result = extract_visible_text(html)
        assert "Chocolate Cake" in result
        assert "Mix flour and cocoa." in result
        assert "ga(" not in result
        assert "Home" not in result  # nav is stripped


# ═════════════════════════════════════════════════════════════════════
# Async service tests – call_openai_chat
# ═════════════════════════════════════════════════════════════════════


@patch("app.services.token_service.get_bearer_token", new_callable=AsyncMock, return_value=None)
class TestCallOpenaiChat:
    @pytest.mark.asyncio
    @patch("app.services.recipe_service.get_settings")
    async def test_returns_error_when_api_key_missing(self, mock_get_settings, _mock_token):
        mock_get_settings.return_value = MagicMock(openai_api_key="")
        result = await call_openai_chat(text="hello", system_prompt="you are helpful")
        assert result["success"] is False
        assert "not configured" in result["error"].lower()

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    @patch("app.services.recipe_service.get_settings")
    async def test_successful_api_call(self, mock_get_settings, mock_client_cls, _mock_token):
        mock_get_settings.return_value = MagicMock(
            openai_api_key="sk-test",
            chatgpt_api_base="https://api.test",
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True, "data": {"title": "Cake"}}
        mock_response.text = '{"success": true}'

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await call_openai_chat(text="recipe text", system_prompt="extract")
        assert result["success"] is True

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    @patch("app.services.recipe_service.get_settings")
    async def test_timeout_returns_408(self, mock_get_settings, mock_client_cls, _mock_token):
        import httpx

        mock_get_settings.return_value = MagicMock(
            openai_api_key="sk-test",
            chatgpt_api_base="https://api.test",
        )
        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.TimeoutException("timed out")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await call_openai_chat(text="x", system_prompt="y")
        assert result["success"] is False
        assert result["status_code"] == 408

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    @patch("app.services.recipe_service.get_settings")
    async def test_request_error_returns_status_0(self, mock_get_settings, mock_client_cls, _mock_token):
        import httpx

        mock_get_settings.return_value = MagicMock(
            openai_api_key="sk-test",
            chatgpt_api_base="https://api.test",
        )
        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.RequestError("connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await call_openai_chat(text="x", system_prompt="y")
        assert result["success"] is False
        assert result["status_code"] == 0

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    @patch("app.services.recipe_service.get_settings")
    async def test_non_200_returns_error_with_status(self, mock_get_settings, mock_client_cls, _mock_token):
        mock_get_settings.return_value = MagicMock(
            openai_api_key="sk-test",
            chatgpt_api_base="https://api.test",
        )
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = "Rate limited"

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await call_openai_chat(text="x", system_prompt="y")
        assert result["success"] is False
        assert result["status_code"] == 429

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    @patch("app.services.recipe_service.get_settings")
    async def test_text_truncated_to_12000(self, mock_get_settings, mock_client_cls, _mock_token):
        mock_get_settings.return_value = MagicMock(
            openai_api_key="sk-test",
            chatgpt_api_base="https://api.test",
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mock_response.text = "{}"

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        long_text = "a" * 20_000
        await call_openai_chat(text=long_text, system_prompt="y")

        call_args = mock_client.post.call_args
        payload = call_args.kwargs.get("json") or call_args[1].get("json")
        assert len(payload["text"]) == 12_000


# ═════════════════════════════════════════════════════════════════════
# Async service tests – fetch_and_extract
# ═════════════════════════════════════════════════════════════════════


class TestFetchAndExtract:
    @pytest.mark.asyncio
    @patch("app.services.robots_service.is_allowed", new_callable=AsyncMock, return_value=True)
    @patch("app.services.recipe_service.httpx.AsyncClient")
    async def test_private_redirect_returns_bad_request(self, mock_client_cls, _mock_robots):
        from app.services.public_url_transport import UnsafeDestinationError

        mock_client = AsyncMock()
        mock_client.get.side_effect = UnsafeDestinationError("non-public")
        mock_client.__aenter__.return_value = mock_client
        mock_client_cls.return_value = mock_client

        result = await fetch_and_extract("https://example.com/recipe")
        assert result["status_code"] == 400
        assert "private" in result["error"]

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    async def test_successful_fetch(self, mock_client_cls):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><title>My Recipe</title><body><p>Mix ingredients.</p></body></html>"

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await fetch_and_extract("https://example.com/recipe")
        assert result["ok"] is True
        assert result["title"] == "My Recipe"
        assert "Mix ingredients" in result["text"]

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    async def test_timeout_returns_408(self, mock_client_cls):
        import httpx

        mock_client = AsyncMock()
        mock_client.get.side_effect = httpx.TimeoutException("timeout")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await fetch_and_extract("https://slow.example.com")
        assert result["ok"] is False
        assert result["status_code"] == 408

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    async def test_request_error_returns_status_0(self, mock_client_cls):
        import httpx

        mock_client = AsyncMock()
        mock_client.get.side_effect = httpx.RequestError("DNS failure")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await fetch_and_extract("https://nonexistent.example.com")
        assert result["ok"] is False
        assert result["status_code"] == 0

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    async def test_non_200_returns_error(self, mock_client_cls):
        mock_response = MagicMock()
        mock_response.status_code = 403

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await fetch_and_extract("https://blocked.example.com")
        assert result["ok"] is False
        assert result["status_code"] == 403

    @pytest.mark.asyncio
    @patch("app.services.recipe_service.httpx.AsyncClient")
    async def test_empty_page_returns_error(self, mock_client_cls):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><script>all js no text</script></html>"

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await fetch_and_extract("https://empty.example.com")
        assert result["ok"] is False
        assert "no readable text" in result["error"].lower()


class TestPublicURLTransport:
    @pytest.mark.asyncio
    async def test_pinned_https_verifies_original_hostname(self, tmp_path):
        import asyncio
        import ssl
        from datetime import datetime, timedelta, timezone
        import httpx
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID
        from app.services.public_url_transport import PublicURLTransport

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "example.com")])
        cert = (
            x509.CertificateBuilder()
            .subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.now(timezone.utc) - timedelta(minutes=1))
            .not_valid_after(datetime.now(timezone.utc) + timedelta(days=1))
            .add_extension(x509.SubjectAlternativeName([x509.DNSName("example.com")]), False)
            .sign(key, hashes.SHA256())
        )
        cert_path = tmp_path / "cert.pem"
        key_path = tmp_path / "key.pem"
        cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        key_path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))
        server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_context.load_cert_chain(cert_path, key_path)
        client_context = ssl.create_default_context(cafile=str(cert_path))

        async def respond(reader, writer):
            await reader.readuntil(b"\r\n\r\n")
            writer.write(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK")
            await writer.drain()
            writer.close()

        server = await asyncio.start_server(respond, "127.0.0.1", 0, ssl=server_context)
        port = server.sockets[0].getsockname()[1]
        try:
            with patch.object(PublicURLTransport, "_resolve_public_address", new_callable=AsyncMock, return_value="127.0.0.1"):
                async with httpx.AsyncClient(transport=PublicURLTransport(verify=client_context)) as client:
                    response = await client.get(f"https://example.com:{port}/")
                    assert response.text == "OK"
                    with pytest.raises(httpx.ConnectError):
                        await client.get(f"https://different.example:{port}/")
        finally:
            server.close()
            await server.wait_closed()

    @pytest.mark.asyncio
    async def test_pins_public_resolution_and_preserves_host_and_tls_name(self):
        import asyncio
        import httpx
        import socket
        from app.services.public_url_transport import PublicURLTransport

        transport = PublicURLTransport()
        await transport._transport.aclose()
        observed = []
        transport._transport = httpx.MockTransport(
            lambda request: observed.append(request) or httpx.Response(200, text="ok")
        )
        resolved = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("1.1.1.1", 443))]
        with patch.object(asyncio.get_running_loop(), "getaddrinfo", new_callable=AsyncMock, return_value=resolved):
            async with httpx.AsyncClient(transport=transport) as client:
                response = await client.get("https://example.com/recipe")

        assert response.text == "ok"
        assert observed[0].url.host == "1.1.1.1"
        assert observed[0].headers["host"] == "example.com"
        assert observed[0].extensions["sni_hostname"] == "example.com"
        assert str(response.url) == "https://example.com/recipe"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("ip", ["127.0.0.1", "169.254.169.254", "168.63.129.16", "::1"])
    async def test_blocks_internal_dns_answers(self, ip):
        import asyncio
        import httpx
        import socket
        from app.services.public_url_transport import PublicURLTransport

        transport = PublicURLTransport()
        resolved = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 80))]
        with patch.object(asyncio.get_running_loop(), "getaddrinfo", new_callable=AsyncMock, return_value=resolved):
            async with httpx.AsyncClient(transport=transport) as client:
                with pytest.raises(httpx.ConnectError, match="non-public"):
                    await client.get("http://attacker.example/")

    @pytest.mark.asyncio
    async def test_blocks_redirect_to_internal_destination(self):
        import asyncio
        import httpx
        import socket
        from app.services.public_url_transport import PublicURLTransport

        transport = PublicURLTransport()
        await transport._transport.aclose()
        requests = []
        transport._transport = httpx.MockTransport(
            lambda request: requests.append(request)
            or httpx.Response(302, headers={"Location": "http://internal.example/"})
        )

        async def resolve(host, port, **kwargs):
            ip = "1.1.1.1" if host == "example.com" else "127.0.0.1"
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))]

        with patch.object(asyncio.get_running_loop(), "getaddrinfo", side_effect=resolve):
            async with httpx.AsyncClient(transport=transport, follow_redirects=True) as client:
                with pytest.raises(httpx.ConnectError, match="non-public"):
                    await client.get("https://example.com/")
        assert len(requests) == 1


# ═════════════════════════════════════════════════════════════════════
# Async service tests – saved recipe DB operations
# ═════════════════════════════════════════════════════════════════════


class TestCountSavedRecipes:
    @pytest.mark.asyncio
    async def test_returns_count(self, patch_get_pool):
        patch_get_pool.fetchrow.return_value = make_record({"cnt": 5})
        result = await count_saved_recipes("user-1")
        assert result == 5

    @pytest.mark.asyncio
    async def test_returns_zero_when_no_row(self, patch_get_pool):
        patch_get_pool.fetchrow.return_value = None
        result = await count_saved_recipes("user-1")
        assert result == 0


class TestFindSavedRecipeDuplicate:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("source_url, expected", [
        ("https://example.com/pasta", "https://example.com/pasta"),
        (None, "Pasta"),
    ])
    async def test_scopes_duplicate_to_user(self, patch_get_pool, source_url, expected):
        patch_get_pool.fetchrow.return_value = make_record({
            "id": "recipe-1", "title": "Pasta", "source_url": source_url,
            "folder_id": None, "created_at": "2025-01-01",
        })
        result = await find_saved_recipe_duplicate(
            user_id="user-1", title="Pasta", source_url=source_url,
        )
        assert result["id"] == "recipe-1"
        assert patch_get_pool.fetchrow.call_args.args[1:] == ("user-1", expected)

    @pytest.mark.asyncio
    async def test_no_duplicate(self, patch_get_pool):
        patch_get_pool.fetchrow.return_value = None
        assert await find_saved_recipe_duplicate(user_id="user-1", title="Pasta") is None


class TestGetSavedRecipes:
    @pytest.mark.asyncio
    async def test_returns_mapped_recipes(self, patch_get_pool):
        patch_get_pool.fetch.return_value = [
            make_record(
                {
                    "id": "recipe-1",
                    "title": "Pasta",
                    "source_url": "https://example.com",
                    "created_at": "2025-01-01",
                    "folder_id": None,
                }
            )
        ]
        result = await get_saved_recipes("user-1")
        assert len(result) == 1
        assert result[0]["title"] == "Pasta"
        assert result[0]["sourceUrl"] == "https://example.com"
        assert "source_url" not in result[0]  # camelCase only

    @pytest.mark.asyncio
    async def test_returns_empty_list(self, patch_get_pool):
        patch_get_pool.fetch.return_value = []
        result = await get_saved_recipes("user-1")
        assert result == []


class TestGetSavedRecipeById:
    @pytest.mark.asyncio
    async def test_returns_recipe(self, patch_get_pool, sample_recipe_record):
        patch_get_pool.fetchrow.return_value = sample_recipe_record
        result = await get_saved_recipe_by_id("user-1", "recipe-1")
        assert result is not None
        assert result["title"] == "Test Recipe"
        assert result["sourceUrl"] == "https://example.com/recipe"
        assert isinstance(result["ingredients"], list)
        assert isinstance(result["steps"], list)

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, patch_get_pool):
        patch_get_pool.fetchrow.return_value = None
        result = await get_saved_recipe_by_id("user-1", "nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_parses_steps_from_json_string(self, patch_get_pool, sample_recipe_record):
        sample_recipe_record["steps"] = json.dumps(
            [{"instruction": "Step 1", "ingredients": []}]
        )
        patch_get_pool.fetchrow.return_value = sample_recipe_record
        result = await get_saved_recipe_by_id("user-1", "recipe-1")
        assert result["steps"][0]["instruction"] == "Step 1"


class TestCreateSavedRecipe:
    @pytest.mark.asyncio
    async def test_returns_created_recipe(self, patch_get_pool):
        patch_get_pool.fetchrow.return_value = make_record(
            {
                "id": "new-recipe-id",
                "title": "New Recipe",
                "source_url": "https://new.com",
                "created_at": "2025-06-01",
                "folder_id": None,
            }
        )
        result = await create_saved_recipe(user_id="user-1", title="New Recipe")
        assert result["id"] == "new-recipe-id"
        assert result["title"] == "New Recipe"

    @pytest.mark.asyncio
    async def test_raises_on_insert_failure(self, patch_get_pool):
        patch_get_pool.fetchrow.return_value = None
        with pytest.raises(RuntimeError, match="Failed to insert"):
            await create_saved_recipe(user_id="user-1", title="Fail")
