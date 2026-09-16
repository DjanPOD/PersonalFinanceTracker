export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  name: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "Bearer";
  user: User;
};

export type RegisterResponse = {
  user: User;
};

export type CurrentUserResponse = {
  user: User;
};