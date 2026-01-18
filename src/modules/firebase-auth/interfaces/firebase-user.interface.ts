/**
 * Representa un usuario autenticado con Firebase
 * Se inyecta en el request después de validar el token
 */
export interface FirebaseUser {
  /**
   * UID único de Firebase
   */
  uid: string;

  /**
   * Email del usuario (puede ser null si usa phone auth)
   */
  email?: string;

  /**
   * Indica si el email ha sido verificado
   */
  emailVerified: boolean;

  /**
   * Nombre para mostrar
   */
  displayName?: string;

  /**
   * URL de foto de perfil
   */
  photoURL?: string;

  /**
   * Número de teléfono
   */
  phoneNumber?: string;

  /**
   * ID del usuario en nuestra base de datos (si está asociado)
   */
  localUserId?: string;
}
