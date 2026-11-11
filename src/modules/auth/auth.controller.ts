import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { LoginDto } from './dto/login.dto.js';
import { LoginService } from './login.service.js';
import type { LoginResponse } from './login.service.js';
import { Public } from './public.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar administrador' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'senha'],
      properties: {
        email: { type: 'string', format: 'email' },
        senha: { type: 'string', format: 'password' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'JWT e dados públicos do administrador',
    schema: {
      type: 'object',
      required: ['token', 'expiraEm', 'usuario'],
      properties: {
        token: { type: 'string' },
        expiraEm: { type: 'string', format: 'date-time' },
        usuario: {
          type: 'object',
          required: ['id', 'nome', 'email'],
          properties: {
            id: { type: 'integer' },
            nome: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados de login inválidos' })
  @ApiResponse({ status: 401, description: 'E-mail ou senha inválidos' })
  login(@Body() credentials: LoginDto): Promise<LoginResponse> {
    return this.loginService.login(credentials);
  }
}
