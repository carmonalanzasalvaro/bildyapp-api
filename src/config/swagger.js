import swaggerJsdoc from 'swagger-jsdoc';
import config from './index.js';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'BildyApp API',
    version: '1.0.0',
    description: 'API REST para autenticación, gestión de clientes, proyectos y albaranes.'
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Servidor local'
    }
  ],
  tags: [
    { name: 'Health', description: 'Estado de la API' },
    { name: 'Users', description: 'Autenticación y perfil de usuario' },
    { name: 'Clients', description: 'Gestión de clientes' },
    { name: 'Projects', description: 'Gestión de proyectos' },
    { name: 'Delivery notes', description: 'Gestión de albaranes' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ObjectId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$',
        example: '6815d1db0e56f67ba4d9f0f1'
      },
      Address: {
        type: 'object',
        required: ['street', 'number', 'postal', 'city', 'province'],
        properties: {
          street: { type: 'string', example: 'Gran Vía' },
          number: { type: 'string', example: '10' },
          postal: { type: 'string', example: '28013' },
          city: { type: 'string', example: 'Madrid' },
          province: { type: 'string', example: 'Madrid' }
        }
      },
      Worker: {
        type: 'object',
        required: ['name', 'hours'],
        properties: {
          name: { type: 'string', example: 'Ana' },
          hours: { type: 'number', example: 5 }
        }
      },
      User: {
        type: 'object',
        required: ['_id', 'email', 'status', 'role', 'deleted', 'createdAt', 'updatedAt'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          name: { type: 'string', nullable: true, example: 'Ada' },
          lastName: { type: 'string', nullable: true, example: 'Lovelace' },
          fullName: { type: 'string', example: 'Ada Lovelace' },
          nif: { type: 'string', nullable: true, example: '12345678A' },
          address: { type: 'string', nullable: true, example: 'Calle Principal 1' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          status: { type: 'string', enum: ['pending', 'verified'], example: 'verified' },
          role: { type: 'string', enum: ['admin', 'guest'], example: 'admin' },
          company: {
            oneOf: [
              { $ref: '#/components/schemas/ObjectId' },
              { $ref: '#/components/schemas/Company' },
              { type: 'null' }
            ]
          },
          deleted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Company: {
        type: 'object',
        required: ['_id', 'owner', 'name', 'cif', 'address', 'isFreelance', 'deleted', 'createdAt', 'updatedAt'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          owner: { $ref: '#/components/schemas/ObjectId' },
          name: { type: 'string', example: 'Ada Lovelace' },
          cif: { type: 'string', example: '12345678A' },
          address: { type: 'string', example: 'Calle Principal 1' },
          logo: { type: 'string', nullable: true, example: 'https://cdn.example.com/logo.png' },
          isFreelance: { type: 'boolean', example: true },
          deleted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Client: {
        type: 'object',
        required: ['_id', 'user', 'company', 'name', 'cif', 'email', 'address', 'deleted', 'createdAt', 'updatedAt'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          user: { $ref: '#/components/schemas/ObjectId' },
          company: { $ref: '#/components/schemas/ObjectId' },
          name: { type: 'string', example: 'ACME Corp' },
          cif: { type: 'string', example: 'B12345678' },
          email: { type: 'string', format: 'email', example: 'contacto@acme.test' },
          phone: { type: 'string', nullable: true, example: '600123123' },
          address: { $ref: '#/components/schemas/Address' },
          deleted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Project: {
        type: 'object',
        required: ['_id', 'user', 'company', 'client', 'name', 'projectCode', 'address', 'email', 'active', 'deleted', 'createdAt', 'updatedAt'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          user: { $ref: '#/components/schemas/ObjectId' },
          company: { $ref: '#/components/schemas/ObjectId' },
          client: {
            oneOf: [
              { $ref: '#/components/schemas/ObjectId' },
              { $ref: '#/components/schemas/Client' }
            ]
          },
          name: { type: 'string', example: 'Reforma integral' },
          projectCode: { type: 'string', example: 'PRJ-001' },
          address: { $ref: '#/components/schemas/Address' },
          email: { type: 'string', format: 'email', example: 'obra@acme.test' },
          notes: { type: 'string', nullable: true, example: 'Notas del proyecto' },
          active: { type: 'boolean', example: true },
          deleted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      DeliveryNote: {
        type: 'object',
        required: ['_id', 'user', 'company', 'client', 'project', 'format', 'description', 'workDate', 'signed', 'deleted', 'createdAt', 'updatedAt'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          user: {
            oneOf: [
              { $ref: '#/components/schemas/ObjectId' },
              { $ref: '#/components/schemas/User' }
            ]
          },
          company: { $ref: '#/components/schemas/ObjectId' },
          client: {
            oneOf: [
              { $ref: '#/components/schemas/ObjectId' },
              { $ref: '#/components/schemas/Client' }
            ]
          },
          project: {
            oneOf: [
              { $ref: '#/components/schemas/ObjectId' },
              { $ref: '#/components/schemas/Project' }
            ]
          },
          format: { type: 'string', enum: ['material', 'hours'], example: 'material' },
          description: { type: 'string', example: 'Entrega de ladrillos' },
          workDate: { type: 'string', format: 'date-time' },
          material: { type: 'string', nullable: true, example: 'Ladrillo' },
          quantity: { type: 'number', nullable: true, example: 120 },
          unit: { type: 'string', nullable: true, example: 'uds' },
          hours: { type: 'number', nullable: true, example: 8 },
          workers: {
            type: 'array',
            items: { $ref: '#/components/schemas/Worker' }
          },
          signed: { type: 'boolean', example: false },
          signedAt: { type: 'string', format: 'date-time', nullable: true },
          signatureUrl: { type: 'string', nullable: true, example: 'https://storage.test/signatures/signature.webp' },
          pdfUrl: { type: 'string', nullable: true, example: 'https://storage.test/pdf/delivery-note.pdf' },
          deleted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      PaginationMeta: {
        type: 'object',
        required: ['totalPages', 'totalItems', 'currentPage', 'data'],
        properties: {
          totalPages: { type: 'integer', example: 1 },
          totalItems: { type: 'integer', example: 1 },
          currentPage: { type: 'integer', example: 1 },
          data: { type: 'array', items: {} }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          password: { type: 'string', minLength: 8, example: 'secreta123' }
        }
      },
      LoginRequest: {
        allOf: [{ $ref: '#/components/schemas/RegisterRequest' }]
      },
      ValidationRequest: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^\\d{6}$', example: '123456' }
        }
      },
      UpdateProfileRequest: {
        type: 'object',
        required: ['name', 'lastName', 'nif', 'address'],
        properties: {
          name: { type: 'string', example: 'Ada' },
          lastName: { type: 'string', example: 'Lovelace' },
          nif: { type: 'string', example: '12345678A' },
          address: { type: 'string', example: 'Calle Principal 1' }
        }
      },
      OnboardCompanyRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Ada Construcciones' },
          cif: { type: 'string', example: 'A12345678' },
          address: { type: 'string', example: 'Calle Empresa 1' },
          isFreelance: { type: 'boolean', example: false }
        }
      },
      ClientRequest: {
        type: 'object',
        required: ['name', 'cif', 'email', 'address'],
        properties: {
          name: { type: 'string', example: 'ACME Corp' },
          cif: { type: 'string', example: 'B12345678' },
          email: { type: 'string', format: 'email', example: 'contacto@acme.test' },
          phone: { type: 'string', example: '600123123' },
          address: { $ref: '#/components/schemas/Address' }
        }
      },
      ProjectRequest: {
        type: 'object',
        required: ['client', 'name', 'projectCode', 'address', 'email'],
        properties: {
          client: { $ref: '#/components/schemas/ObjectId' },
          name: { type: 'string', example: 'Reforma integral' },
          projectCode: { type: 'string', example: 'PRJ-001' },
          address: { $ref: '#/components/schemas/Address' },
          email: { type: 'string', format: 'email', example: 'obra@acme.test' },
          notes: { type: 'string', example: 'Notas del proyecto' },
          active: { type: 'boolean', example: true }
        }
      },
      MaterialDeliveryNoteRequest: {
        type: 'object',
        required: ['client', 'project', 'format', 'description', 'workDate', 'material', 'quantity', 'unit'],
        properties: {
          client: { $ref: '#/components/schemas/ObjectId' },
          project: { $ref: '#/components/schemas/ObjectId' },
          format: { type: 'string', enum: ['material'], example: 'material' },
          description: { type: 'string', example: 'Entrega de ladrillos' },
          workDate: { type: 'string', format: 'date-time', example: '2025-04-10T00:00:00.000Z' },
          material: { type: 'string', example: 'Ladrillo' },
          quantity: { type: 'number', example: 120 },
          unit: { type: 'string', example: 'uds' }
        }
      },
      HoursDeliveryNoteRequest: {
        type: 'object',
        required: ['client', 'project', 'format', 'description', 'workDate'],
        properties: {
          client: { $ref: '#/components/schemas/ObjectId' },
          project: { $ref: '#/components/schemas/ObjectId' },
          format: { type: 'string', enum: ['hours'], example: 'hours' },
          description: { type: 'string', example: 'Jornada de instalación' },
          workDate: { type: 'string', format: 'date-time', example: '2025-05-12T00:00:00.000Z' },
          hours: { type: 'number', example: 8 },
          workers: {
            type: 'array',
            items: { $ref: '#/components/schemas/Worker' }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        required: ['status', 'db', 'uptime', 'timestamp'],
        properties: {
          status: { type: 'string', example: 'ok' },
          db: { type: 'string', example: 'connected' },
          uptime: { type: 'number', example: 12.345 },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ErrorResponse: {
        type: 'object',
        required: ['error', 'message', 'code'],
        properties: {
          error: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Error de validación' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'El email no es válido' }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Consultar estado de la API',
        responses: {
          200: {
            description: 'Estado actual de la API',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' }
              }
            }
          }
        }
      }
    },
    '/api/user/register': {
      post: {
        tags: ['Users'],
        summary: 'Registrar usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Usuario registrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          409: {
            description: 'Email duplicado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Users'],
        summary: 'Completar perfil de usuario',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Perfil actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/user/validation': {
      put: {
        tags: ['Users'],
        summary: 'Validar email con código',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Usuario validado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/user/login': {
      post: {
        tags: ['Users'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Inicio de sesión correcto',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/user/company': {
      patch: {
        tags: ['Users'],
        summary: 'Crear o actualizar empresa del usuario',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OnboardCompanyRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Empresa actualizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/user': {
      get: {
        tags: ['Users'],
        summary: 'Obtener usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Perfil actual',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Users'],
        summary: 'Eliminar usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Usuario eliminado'
          }
        }
      }
    },
    '/api/client': {
      post: {
        tags: ['Clients'],
        summary: 'Crear cliente',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClientRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Cliente creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    client: { $ref: '#/components/schemas/Client' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        tags: ['Clients'],
        summary: 'Listar clientes activos',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'name', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: 'createdAt' } }
        ],
        responses: {
          200: {
            description: 'Listado paginado de clientes',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginationMeta' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Client' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/client/archived': {
      get: {
        tags: ['Clients'],
        summary: 'Listar clientes archivados',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado paginado de clientes archivados'
          }
        }
      }
    },
    '/api/client/{id}': {
      get: {
        tags: ['Clients'],
        summary: 'Obtener cliente por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'Cliente encontrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    client: { $ref: '#/components/schemas/Client' }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Clients'],
        summary: 'Actualizar cliente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClientRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Cliente actualizado'
          }
        }
      },
      delete: {
        tags: ['Clients'],
        summary: 'Eliminar o archivar cliente',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } },
          { name: 'soft', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } }
        ],
        responses: {
          200: {
            description: 'Cliente eliminado o archivado'
          }
        }
      }
    },
    '/api/client/{id}/restore': {
      patch: {
        tags: ['Clients'],
        summary: 'Restaurar cliente archivado',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'Cliente restaurado'
          }
        }
      }
    },
    '/api/project': {
      post: {
        tags: ['Projects'],
        summary: 'Crear proyecto',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProjectRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Proyecto creado'
          }
        }
      },
      get: {
        tags: ['Projects'],
        summary: 'Listar proyectos activos',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'client', in: 'query', schema: { $ref: '#/components/schemas/ObjectId' } },
          { name: 'name', in: 'query', schema: { type: 'string' } },
          { name: 'active', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: 'createdAt' } }
        ],
        responses: {
          200: {
            description: 'Listado paginado de proyectos'
          }
        }
      }
    },
    '/api/project/archived': {
      get: {
        tags: ['Projects'],
        summary: 'Listar proyectos archivados',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado paginado de proyectos archivados'
          }
        }
      }
    },
    '/api/project/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Obtener proyecto por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'Proyecto encontrado'
          }
        }
      },
      put: {
        tags: ['Projects'],
        summary: 'Actualizar proyecto',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProjectRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Proyecto actualizado'
          }
        }
      },
      delete: {
        tags: ['Projects'],
        summary: 'Eliminar o archivar proyecto',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } },
          { name: 'soft', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } }
        ],
        responses: {
          200: {
            description: 'Proyecto eliminado o archivado'
          }
        }
      }
    },
    '/api/project/{id}/restore': {
      patch: {
        tags: ['Projects'],
        summary: 'Restaurar proyecto archivado',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'Proyecto restaurado'
          }
        }
      }
    },
    '/api/deliverynote': {
      post: {
        tags: ['Delivery notes'],
        summary: 'Crear albarán',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/MaterialDeliveryNoteRequest' },
                  { $ref: '#/components/schemas/HoursDeliveryNoteRequest' }
                ]
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Albarán creado'
          }
        }
      },
      get: {
        tags: ['Delivery notes'],
        summary: 'Listar albaranes',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'project', in: 'query', schema: { $ref: '#/components/schemas/ObjectId' } },
          { name: 'client', in: 'query', schema: { $ref: '#/components/schemas/ObjectId' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['material', 'hours'] } },
          { name: 'signed', in: 'query', schema: { type: 'boolean' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: '-workDate' } }
        ],
        responses: {
          200: {
            description: 'Listado paginado de albaranes'
          }
        }
      }
    },
    '/api/deliverynote/{id}': {
      get: {
        tags: ['Delivery notes'],
        summary: 'Obtener albarán por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'Albarán encontrado'
          }
        }
      },
      delete: {
        tags: ['Delivery notes'],
        summary: 'Eliminar albarán',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'Albarán eliminado'
          }
        }
      }
    },
    '/api/deliverynote/{id}/sign': {
      patch: {
        tags: ['Delivery notes'],
        summary: 'Firmar albarán y generar PDF',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['signature'],
                properties: {
                  signature: {
                    type: 'string',
                    format: 'binary'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Albarán firmado'
          }
        }
      }
    },
    '/api/deliverynote/pdf/{id}': {
      get: {
        tags: ['Delivery notes'],
        summary: 'Obtener PDF de albarán',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/ObjectId' } }],
        responses: {
          200: {
            description: 'PDF generado o URL firmada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', example: 'https://storage.test/pdf/existing.pdf?token=abc' }
                      }
                    }
                  }
                }
              },
              'application/pdf': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              }
            }
          }
        }
      }
    }
  }
};

const swaggerSpec = swaggerJsdoc({
  definition,
  apis: []
});

export default swaggerSpec;
